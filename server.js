import express from "express";
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json());
app.use(cookieParser());

/* ================= CONFIG ================= */

const JSONBIN_API_KEY =
"$2a$10$BV..TadGPZnl8Hs6rUs4h.kJFEnRDmK6YPqd8onbIEhfCKSixLI66";

const JSONBIN_BIN_ID =
"69cf5fc7856a682189f61041";

const ADMIN_PASSWORD =
"RESIST_ADMIN";

/* ================= JSONBIN READ ================= */

async function fetchLicenses() {

const res = await fetch(
`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`,
{
headers: {
"X-Master-Key": JSONBIN_API_KEY
}
}
);

const data = await res.json();

return data.record?.licenses || [];

}

/* ================= JSONBIN SAVE ================= */

async function saveLicenses(licenses) {

await fetch(
`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`,
{
method: "PUT",
headers: {
"Content-Type": "application/json",
"X-Master-Key": JSONBIN_API_KEY
},
body: JSON.stringify({ licenses })
}
);

}

/* ================= VALIDATE LICENSE ================= */

app.post("/api/validate-license", async (req, res) => {

const licenseKey =
(req.body.licenseKey || "").toUpperCase();

const deviceId =
(req.body.deviceId || "").toLowerCase();

if (!licenseKey || !deviceId)
return res.json({ valid: false });

const licenses =
await fetchLicenses();

const lic =
licenses.find(
l => l.key.toUpperCase() === licenseKey
);

if (!lic)
return res.json({
valid: false,
error: "invalidLicense"
});

/* first activation */

if (!lic.device_hash) {

lic.device_hash = deviceId;

lic.activated_on =
new Date().toISOString();

const expireDate =
new Date();

expireDate.setDate(
expireDate.getDate() +
lic.duration_days
);

lic.expires_at =
expireDate.toISOString();

await saveLicenses(licenses);

}

/* device mismatch */

if (lic.device_hash !== deviceId)
return res.json({
valid: false,
error: "deviceMismatch"
});

/* expired */

if (
new Date(lic.expires_at) <
new Date()
)
return res.json({
valid: false,
error: "expired"
});

res.json({
valid: true,
expires_at: lic.expires_at
});

});

/* ================= CREATE LICENSE ================= */

app.post("/admin/create-license", async (req, res) => {

if (
req.headers["x-admin-key"] !==
ADMIN_PASSWORD
)
return res.status(403).send("Denied");

const { key, duration_days } =
req.body;

const licenses =
await fetchLicenses();

licenses.push({

key: key.toUpperCase(),

duration_days,

device_hash: null,

activated_on: null,

expires_at: null,

processed_videos: 0

});

await saveLicenses(licenses);

res.json({
success: true
});

});

/* ================= DELETE LICENSE ================= */

app.post("/admin/delete-license", async (req, res) => {

if (
req.headers["x-admin-key"] !==
ADMIN_PASSWORD
)
return res.status(403).send("Denied");

let licenses =
await fetchLicenses();

licenses =
licenses.filter(
l => l.key !== req.body.key
);

await saveLicenses(licenses);

res.json({
success: true
});

});

/* ================= EXTEND LICENSE ================= */

app.post("/admin/extend-license", async (req, res) => {

if (
req.headers["x-admin-key"] !==
ADMIN_PASSWORD
)
return res.status(403).send("Denied");

const { key, extra_days } =
req.body;

const licenses =
await fetchLicenses();

const lic =
licenses.find(
l => l.key === key
);

if (!lic)
return res.json({
error: "not_found"
});

const expireDate =
new Date(
lic.expires_at || Date.now()
);

expireDate.setDate(
expireDate.getDate() + extra_days
);

lic.expires_at =
expireDate.toISOString();

await saveLicenses(licenses);

res.json({
success: true
});

});

/* ================= LIST LICENSES ================= */

app.get("/admin/list", async (req, res) => {

if (
req.headers["x-admin-key"] !==
ADMIN_PASSWORD
)
return res.status(403).send("Denied");

res.json(
await fetchLicenses()
);

});

/* ================= STATIC ================= */

app.use(express.static("public"));

/* ================= PORT ================= */

const PORT =
process.env.PORT || 3000;

app.listen(PORT, () => {

console.log(
"🚀 RESIST TikTok running on port",
PORT
);

});
