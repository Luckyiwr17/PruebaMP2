const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Pool de conexiones a MySQL (usa variables de entorno en Render para las credenciales)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Endpoint receptor del Webhook
app.post('/webhook', async (req, res) => {
    try {
        const data = req.body;

        // Extraer encabezados o IDs opcionales (ejemplo: ID de evento de GitHub)
        const eventoId = req.headers['x-github-delivery'] || data.id || null;
        const tipoEvento = req.headers['x-github-event'] || data.action || 'webhook';

        // Insertar en MySQL
        const query = `
            INSERT INTO webhook_notificaciones (evento_id, tipo_evento, payload) 
            VALUES (?, ?, ?)
        `;
        
        await pool.execute(query, [
            eventoId, 
            tipoEvento, 
            JSON.stringify(data)
        ]);

        console.log(`[MySQL] Notificación guardada exitosamente (ID Evento: ${eventoId})`);

        return res.status(200).send('OK');
    } catch (error) {
        console.error("Error al guardar en MySQL:", error);
        return res.status(500).send('Internal Error');
    }
});

// Endpoint opcional si prefieres que VB.NET consulte por HTTP en vez de conectarse directo a MySQL
app.get('/notificaciones/pendientes', async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT id, evento_id, tipo_evento, payload, fecha_creacion FROM webhook_notificaciones WHERE procesado = 0 ORDER BY id ASC LIMIT 50"
        );
        return res.status(200).json(rows);
    } catch (error) {
        console.error("Error al obtener pendientes:", error);
        return res.status(500).send('Internal Error');
    }
});

app.get('/', (req, res) => {
    res.send('Servidor Webhook de mi PDV Activo');
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
