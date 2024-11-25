//npm run start:dev
import express from "express"
import { createClient } from "@libsql/client";
import dotenv from 'dotenv';
import cors from 'cors'
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config()
const app = express()
const port = parseInt(process.env.PORT);
const {TURSO_DATABASE_URL,TURSO_AUTH_TOKEN,JWT_SECRET} = process.env;

app.use(express.json());
app.use(cors());

console.log("hola mundo!!");

// Conexión a la base de datos
const turso = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN
});

// para asegura CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://juancamilonietob-github-io.onrender.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.get('/', (req, res) => {
  // Obteniendo el link actual de la página
  const link = `${req.protocol}://${req.get('host')}`;
  res.send(`Hola Mundo! usar el siguiente link para ver mas ${link}/carts`);
});

// Obtener todas las cartas
app.get('/carts', async (req, res) => {
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
app.get('/carts/:id', async (req, res) => {
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
app.patch('/carts/:id', async (req, res) => {
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
app.post('/carts', async (req, res) => {
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

// Eliminar una carta por id
app.delete('/carts/:id', async (req, res) => {
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

// Obtener todos los usurios
app.get('/signup', async (req, res) => {
  try {
    const ans = await turso.execute(`SELECT * FROM usuarios`);
    console.log(ans);
    
    // Enviar solo las filas (rows) como respuesta
    res.json(ans.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al obtener los usurios" });
  }
});

// Registro de usuario (Sign up)
app.post('/signup', async (req, res) => {
  const { first_name, last_name, email, birthday, password } = req.body;

  try {
    // Verificar si el usuario ya existe
    const userExist = await turso.execute(`SELECT * FROM usuarios WHERE email = ?`, [email]);
    if (userExist.rows.length > 0) {
      return res.status(400).json({ mensaje: "El usuario ya está registrado" });
    }

    // Cifrar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar nuevo usuario en la base de datos
    const result = await turso.execute(
      `INSERT INTO usuarios (first_name, last_name, email, birthday, password) VALUES (?, ?, ?, ?, ?)`,
      [first_name, last_name, email, birthday, hashedPassword]
    );

    res.status(201).json({ mensaje: "Usuario registrado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al registrar el usuario" });
  }
});

// Inicio de sesión (Login)
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Verificar si el usuario existe
    const user = await turso.execute(`SELECT * FROM usuarios WHERE email = ?`, [email]);
    if (user.rows.length === 0) {
      return res.status(400).json({ mensaje: "Credenciales incorrectas" });
    }

    // Comparar la contraseña
    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) {
      return res.status(400).json({ mensaje: "Credenciales incorrectas" });
    }

    // Generar token de autenticación
    const token = jwt.sign({ user_id: user.rows[0].user_id }, JWT_SECRET, { expiresIn: '1h' });

    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error en el inicio de sesión" });
  }
});

// Ruta protegida de ejemplo
app.get('/protected', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ mensaje: "Token no proporcionado" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ mensaje: "Token inválido" });
    res.json({ mensaje: "Ruta protegida, acceso autorizado", user });
  });
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto http://localhost:${port}`);
});
