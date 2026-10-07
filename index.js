const express = require('express');
const app = express();

// Hostinger asignará el puerto automáticamente mediante la variable de entorno
const PORT = process.env.PORT || 3000;

// Middleware para entender formato JSON
app.use(express.json());

// Endpoint que recibirá el Webhook de Mercado Pago
app.post('/webhook', (req, res) => {
    try {
        const data = req.body;
        
        // Log para ver en la consola de Hostinger qué está llegando
        console.log("Notificación Recibida:", JSON.stringify(data));

        // --- AQUÍ VA TU CONEXIÓN A LA BASE DE DATOS ---
        // Ejemplo conceptual si usaras Supabase o MySQL:
        // await guardarEnBaseDatos({ 
        //    id_pago: data.data.id, 
        //    topico: data.topic,
        //    fecha: new Date()
        // });

        // IMPORTANTE: Responder siempre con un 200 OK a Mercado Pago
        return res.status(200).send('OK');
    } catch (error) {
        console.error("Error procesando webhook:", error);
        return res.status(500).send('Internal Error');
    }
});

// Ruta básica para comprobar que tu servidor está encendido
app.get('/', (req, res) => {
    res.send('Servidor Webhook de mi PDV Activo');
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
