const { requireAuth } = require('../_lib/auth')
const { getPool } = require('../_lib/db')

module.exports = async function handler(req, res) {
  const { id } = req.query

  try {
    const { userId } = await requireAuth(req)
    const db = getPool()

    // Check role
    const { rows: profileRows } = await db.query(
      'SELECT role FROM public.profiles WHERE id = $1',
      [userId]
    )
    const role = profileRows[0]?.role

    if (req.method === 'GET') {
      const { rows } = await db.query(
        'SELECT * FROM public.interns WHERE id = $1',
        [id]
      )
      if (!rows[0]) return res.status(404).json({ error: 'Not found' })
      return res.status(200).json(rows[0])
    }

    if (req.method === 'PUT') {
      // Must be own profile or admin
      const { rows: intern } = await db.query(
        'SELECT user_id FROM public.interns WHERE id = $1',
        [id]
      )
      if (!intern[0]) return res.status(404).json({ error: 'Not found' })
      if (intern[0].user_id !== userId && role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' })
      }

      const {
        name, email, location, whatsapp, main_skill, skills_detail,
        github, portfolio, linkedin, availability, preferred_start_date,
        english_level, timezones, project_description, status,
      } = req.body

      // Non-admins may only reset their own status to 'pending' (resubmit after rejection)
      const allowedStatus = role === 'admin'
        ? status
        : (status === 'pending' ? 'pending' : undefined)

      const { rows } = await db.query(
        `UPDATE public.interns SET
          name = COALESCE($1, name),
          email = COALESCE($2, email),
          location = COALESCE($3, location),
          whatsapp = COALESCE($4, whatsapp),
          main_skill = COALESCE($5, main_skill),
          skills_detail = COALESCE($6, skills_detail),
          github = COALESCE($7, github),
          portfolio = COALESCE($8, portfolio),
          linkedin = COALESCE($9, linkedin),
          availability = COALESCE($10, availability),
          preferred_start_date = COALESCE($11, preferred_start_date),
          english_level = COALESCE($12, english_level),
          timezones = COALESCE($13, timezones),
          project_description = COALESCE($14, project_description),
          status = COALESCE($15, status)
        WHERE id = $16
        RETURNING *`,
        [
          name, email, location, whatsapp, main_skill, skills_detail,
          github, portfolio, linkedin, availability, preferred_start_date,
          english_level, timezones, project_description, allowedStatus ?? null, id,
        ]
      )
      return res.status(200).json(rows[0])
    }

    if (req.method === 'DELETE') {
      // Must be own profile or admin
      const { rows: internDel } = await db.query(
        'SELECT user_id FROM public.interns WHERE id = $1',
        [id]
      )
      if (!internDel[0]) return res.status(404).json({ error: 'Not found' })
      if (internDel[0].user_id !== userId && role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' })
      }

      await db.query('DELETE FROM public.interns WHERE id = $1', [id])
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message })
  }
}
