import express from "express";

const app = express();
app.use(express.json());
app.use(express.static("public"));

/* ========= CONFIG ========= */

const JSONBIN_BIN_ID = "69cf5fc7856a682189f61041";

const JSONBIN_API_KEY =
"$2a$10$BV..TadGPZnl8Hs6rUs4h.kJFEnRDmK6YPqd8onbIEhfCKSixLI66";

const ADMIN_PASSWORD = "RESIST_ADMIN";

/* ========= JSONBIN READ ========= */

async function loadLicenses() {

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

/* ========= JSONBIN SAVE ========= */

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

/* ========= VERIFY CODE ========= */

app.post("/api/verify-code", async (req, res) => {

const code = (req.body.code || "").toUpperCase();
const device_id = req.body.device_id;

if (!code || !device_id)
return res.status(400).json({ error: "missing_data" });

const licenses = await loadLicenses();

const license = licenses.find(l => l.key === code);

if (!license)
return res.status(403).json({ error: "invalid_code" });

/* first activation */

if (!license.device_id) {

license.device_id = device_id;

license.activated_at =
new Date().toISOString();

const expire = new Date();

expire.setDate(
expire.getDate() + license.duration_days
);

license.expires_at = expire.toISOString();

await saveLicenses(licenses);

}

/* device mismatch */

if (license.device_id !== device_id)
return res.status(403).json({ error: "deviceMismatch" });

/* expired */

if (new Date(license.expires_at) < new Date())
return res.status(403).json({ error: "expired" });

/* remaining time */

const remaining_ms =
new Date(license.expires_at) - new Date();

const remaining_days =
Math.floor(remaining_ms / 86400000);

res.json({
remaining: remaining_days + " يوم",
percent: 100
});

});

/* ========= CREATE LICENSE ========= */

app.post("/admin/create-license", async (req, res) => {

if (req.headers["x-admin-key"] !== ADMIN_PASSWORD)
return res.status(403).send("denied");

const { key, duration_days } = req.body;

const licenses = await loadLicenses();

licenses.push({

key: key.toUpperCase(),

duration_days,

device_id: null,

activated_at: null,

expires_at: null

});

await saveLicenses(licenses);

res.json({ success: true });

});

/* ========= DELETE LICENSE ========= */

app.post("/admin/delete-license", async (req, res) => {

if (req.headers["x-admin-key"] !== ADMIN_PASSWORD)
return res.status(403).send("denied");

let licenses = await loadLicenses();

licenses =
licenses.filter(l => l.key !== req.body.key);

await saveLicenses(licenses);

res.json({ success: true });

});

/* ========= EXTEND LICENSE ========= */

app.post("/admin/extend-license", async (req, res) => {

if (req.headers["x-admin-key"] !== ADMIN_PASSWORD)
return res.status(403).send("denied");

const { key, extra_days } = req.body;

const licenses = await loadLicenses();

const license =
licenses.find(l => l.key === key);

if (!license)
return res.json({ error: "not_found" });

const expire = new Date(
license.expires_at || Date.now()
);

expire.setDate(
expire.getDate() + extra_days
);

license.expires_at = expire.toISOString();

await saveLicenses(licenses);

res.json({ success: true });

});

/* ========= LIST LICENSES ========= */

app.get("/admin/list", async (req, res) => {

if (req.headers["x-admin-key"] !== ADMIN_PASSWORD)
return res.status(403).send("denied");

res.json(await loadLicenses());

});

/* ========= START SERVER ========= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

console.log("RESIST TikTok running on port", PORT);

});
