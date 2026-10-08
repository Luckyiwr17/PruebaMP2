const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Conexión a MySQL usando Variables de Entorno
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 1. Endpoint Receptor de Webhooks (Guardar evento en MySQL)
app.post('/webhook', async (req, res) => {
    try {
        const data = req.body;
        const eventoId = req.headers['x-github-delivery'] || data.id || null;
        const tipoEvento = req.headers['x-github-event'] || data.action || 'webhook';
        const id_order = data.data.id || null;
        const externalRef = data.data.external_reference || null;
        const status = data.data.status || null;
        const action = data.action || null;
        

        const query = `
            INSERT INTO webhook_notificaciones (evento_id, tipo_evento, payload) 
            VALUES (?, ?, ?)
        `;
        
        await pool.execute(query, [eventoId, tipoEvento, JSON.stringify(data)]);
        console.log(`[Webhook] Notificación guardada exitosamente (ID: ${eventoId})`);
        console.log(`[Webhook] Orden ID: ${id_order}`);
        console.log(`[Webhook] Referencia externa: ${externalRef}`);
        console.log(`[Webhook] Status: ${status}`);
        console.log(`[Webhook] Acción: ${action}`);

        return res.status(200).send('OK');
    } catch (error) {
        console.error("Error al guardar webhook:", error);
        return res.status(500).send('Internal Error');
    }
});

// 2. Endpoint GET: VB.NET consulta notificaciones pendientes
app.get('/notificaciones/pendientes', async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT id, evento_id, tipo_evento, payload, fecha_creacion FROM webhook_notificaciones WHERE procesado = 0 ORDER BY id ASC LIMIT 50"
        );
        return res.status(200).json(rows);
    } catch (error) {
        console.error("Error al obtener notificaciones pendientes:", error);
        return res.status(500).send('Internal Error');
    }
});

// 3. Endpoint POST: VB.NET marca como procesadas las notificaciones
app.post('/notificaciones/marcar-procesadas', async (req, res) => {
    try {
        const { ids } = req.body; // Se espera un array de IDs, ej: [1, 2, 3]

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: "Debe proporcionar una lista de IDs válidos" });
        }

        // Construir placeholders dinámicos '?, ?, ?' para la consulta SQL
        const placeholders = ids.map(() => '?').join(',');
        const query = `UPDATE webhook_notificaciones SET procesado = 1 WHERE id IN (${placeholders})`;

        await pool.execute(query, ids);

        return res.status(200).json({ status: "OK", mensaje: `${ids.length} notificaciones marcadas como procesadas` });
    } catch (error) {
        console.error("Error al actualizar estado de notificaciones:", error);
        return res.status(500).send('Internal Error');
    }
});

app.get('/', (req, res) => {
    res.send('Servidor Webhook PDV Activo');
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
