const { Router } = require('express');
const { addTeam, processResult, teamResult } = require('../controller/teamController');
const router = Router();

router.post('/add-team', addTeam)
router.post('/process-result', processResult)
router.get('/team-result', teamResult)

module.exports = router;