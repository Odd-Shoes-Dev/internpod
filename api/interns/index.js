const { requireAuth } = require('../_lib/auth')
const { getPool } = require('../_lib/db')

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = await requireAuth(req)
    const db = getPool()

    // If caller is a startup, verify their profile is approved
    const { rows: profileRows } = await db.query(
      'SELECT role FROM public.profiles WHERE id = $1',
      [userId]
    )
    if (profileRows[0]?.role === 'startup') {
      const { rows: spRows } = await db.query(
        `SELECT status FROM public.startup_profiles WHERE user_id = $1`,
        [userId]
      )
      if (!spRows[0] || spRows[0].status !== 'approved') {
        return res.status(403).json({ error: 'Your company profile is pending admin approval' })
      }
    }

    const { rows } = await db.query(
      `SELECT * FROM public.interns WHERE status = 'approved' ORDER BY created_at DESC`
    )

    return res.status(200).json(rows)
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message })
  }
}
