const { requireAdmin } = require('../_lib/auth')
const { getPool } = require('../_lib/db')

module.exports = async function handler(req, res) {
  try {
    const db = getPool()
    await requireAdmin(req, db)

    if (req.method === 'GET') {
      const { rows } = await db.query(
        `SELECT sp.*,
          (SELECT COUNT(*) FROM public.pod_selections ps WHERE ps.startup_id = sp.user_id) as selection_count,
          (SELECT COUNT(*) FROM public.pod_selections ps WHERE ps.startup_id = sp.user_id AND ps.confirmed = true) as confirmed_count
         FROM public.startup_profiles sp
         ORDER BY sp.created_at DESC`
      )
      return res.status(200).json(rows)
    }

    if (req.method === 'PUT') {
      const { id } = req.query
      if (!id) return res.status(400).json({ error: 'id (user_id) is required' })
      const { status } = req.body
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' })
      }
      const { rows } = await db.query(
        `UPDATE public.startup_profiles SET status = $1 WHERE user_id = $2 RETURNING *`,
        [status, id]
      )
      if (!rows[0]) return res.status(404).json({ error: 'Startup not found' })
      return res.status(200).json(rows[0])
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message })
  }
}
