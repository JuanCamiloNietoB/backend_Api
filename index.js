//npm run start:dev
import express from "express"
import { createClient } from "@libsql/client";
import dotenv from 'dotenv';

dotenv.config()
const app = express()
const port = parseInt(process.env.PORT) || 3000;
app.use(express.json());

console.log("hola mundo!!");

const {TURSO_DATABASE_URL,TURSO_AUTH_TOKEN} = process.env;

const turso = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN
});

// Obtener todos los usuarios
app.get('/users', async (req, res) => {
  try {
    const ans = await turso.execute(`SELECT * FROM contacts`);
    console.log(ans);
    
    // Enviar solo las filas (rows) como respuesta
    res.json(ans.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al obtener los usuarios" });
  }
});

// Obtener un usuario por contact_id
app.get('/users/:contact_id', async (req, res) => {
  const { contact_id } = req.params;
  
  try {
    const ans = await turso.execute(`SELECT * FROM contacts WHERE contact_id = ?`, [contact_id]);
    if (ans.rows.length === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    res.json(ans.rows[0]);  // Enviar el primer usuario (asumiendo que contact_id es único)
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al obtener el usuario" });
  }
});

// Actualizar un usuario por contact_id
app.patch('/users/:contact_id', async (req, res) => {
  const { contact_id } = req.params;
  const { first_name,last_name, email, phone } = req.body; // Campos que se podrían actualizar

  try {
    const ans = await turso.execute(
      `UPDATE contacts SET first_name = ?, last_name = ?, email = ?, phone = ? WHERE contact_id = ?`,
      [first_name,last_name, email, phone, contact_id]
    );
    
    if (ans.changes === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado o sin cambios" });
    }

    res.json({ mensaje: "Usuario actualizado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al actualizar el usuario" });
  }
});

// Crear un nuevo usuario
app.post('/users', async (req, res) => {
  const { first_name, last_name, email, phone } = req.body; // Los datos del nuevo usuario

  try {
    const ans = await turso.execute(
      `INSERT INTO contacts (first_name, last_name, email, phone) VALUES (?, ?, ?, ?)`,
      [first_name, last_name, email, phone]
    );

    if (ans.changes === 0) {
      return res.status(400).json({ mensaje: "Error al crear el usuario" });
    }

    res.status(201).json({ mensaje: "Usuario creado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al crear el usuario" });
  }
});

// Eliminar un usuario por contact_id
app.delete('/users/:contact_id', async (req, res) => {
  const { contact_id } = req.params;

  try {
    const ans = await turso.execute(`DELETE FROM contacts WHERE contact_id = ?`, [contact_id]);
    
    if (ans.changes === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    res.json({ mensaje: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al eliminar el usuario" });
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto http://localhost:${port}`);
});
