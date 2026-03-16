const router = require('express').Router();
const Config = require('../models/Config');
const { auth, soloAdmin } = require('../middleware/auth');

router.get('/', auth, async (_req, res) => {
  try {
    let config = await Config.findOne();
    if (!config) config = await Config.create({});
    res.json(config);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/', auth, soloAdmin, async (req, res) => {
  try {
    let config = await Config.findOne();
    if (!config) config = new Config();
    Object.assign(config, req.body);
    await config.save();
    res.json(config);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
