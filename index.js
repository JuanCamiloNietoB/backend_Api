//npm run start:dev
import express from "express"
import { createClient } from "@libsql/client";
import dotenv from 'dotenv';
import cors from 'cors'
//import bcrypt from 'bcrypt';
//import jwt from 'jsonwebtoken';

dotenv.config()
const app = express()
const port = parseInt(process.env.PORT);
const {TURSO_DATABASE_URL,TURSO_AUTH_TOKEN} = process.env;

app.use(express.json());
app.use(cors());

console.log("hola mundo!!");

// Conexión a la base de datos
const turso = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN
});

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://juancamilonietob-github-io.onrender.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.get('/', (req, res) => {
  // Obteniendo el link actual de la página
  const link = `${req.protocol}://${req.get('host')}`;
  res.send(`Hola Mundo! usar el siguiente link para ver mas ${link}/users`);
});

// Obtener todas las cartas
app.get('/users', async (req, res) => {
  try {
    const ans = await turso.execute(`SELECT * FROM cartas`);
    console.log(ans);
    
    // Enviar solo las filas (rows) como respuesta
    res.json(ans.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al obtener las Cartas" });
  }
});

// Obtener una Carta por id
app.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const ans = await turso.execute(`SELECT * FROM cartas WHERE id = ?`, [id]);
    if (ans.rows.length === 0) {
      return res.status(404).json({ mensaje: "Carta no encontrado" });
    }

    res.json(ans.rows[0]);  // Enviar el primer usuario (asumiendo que contact_id es único)
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al obtener la carta" });
  }
});

// Actualizar una Carta por id
app.patch('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { title,description, value, images } = req.body; // Campos que se podrían actualizar

  try {
    const ans = await turso.execute(
      `UPDATE cartas SET title = ?, description = ?, value = ?, images = ? WHERE id = ?`,
      [title,description, value, images, id]
    );
    
    if (ans.changes === 0) {
      return res.status(404).json({ mensaje: "Carta no encontrado o sin cambios" });
    }

    res.json({ mensaje: "Carta actualizado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al actualizar la carta" });
  }
});

// Crear un nueva carta
app.post('/users', async (req, res) => {
  const { title, description, value, images } = req.body; // Los datos de la nueva cartar

  try {
    const ans = await turso.execute(
      `INSERT INTO cartas (title, description, value, images) VALUES (?, ?, ?, ?)`,
      [title, description, value, images]
    );

    if (ans.changes === 0) {
      return res.status(400).json({ mensaje: "Error al crear la carta" });
    }

    res.status(201).json({ mensaje: "Carta creado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al crear el carta" });
  }
});

// Eliminar un usuario por id
app.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const ans = await turso.execute(`DELETE FROM cartas WHERE id = ?`, [id]);
    
    if (ans.changes === 0) {
      return res.status(404).json({ mensaje: "Carta no encontrado" });
    }

    res.json({ mensaje: "Carta eliminado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al eliminar carta" });
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto http://localhost:${port}`);
});
