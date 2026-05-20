require('dotenv').config()
console.log(process.env.MONGO_URI)

const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const app = express()

// =====================
// 🔥 MIDDLEWARES
// =====================

app.use(cors())
app.use(express.json())
app.use(express.static('public'))

// =====================
// 🔥 MONGODB
// =====================

mongoose.connect(process.env.MONGO_URI)

.then(() => {

    console.log('Mongo conectado 🔥')
})

.catch(err => {

    console.log(err)
})

// =====================
// 📦 MODELOS
// =====================

const Usuario = mongoose.model('Usuario', {

    nombre: String,

    usuario: String,

    password: String,

    rol: String
})

const Materia = mongoose.model('Materia', {

    nombre:String
})

const Alumno = mongoose.model('Alumno', {

    nombre:String,

    edad:String
})

const Clase = mongoose.model('Clase', {

    materiaId:
        mongoose.Schema.Types.ObjectId,

    maestroId:
        mongoose.Schema.Types.ObjectId,

    grupo:String,

    horario:String,

    aula:String,

    alumnos:[
        mongoose.Schema.Types.ObjectId
    ]
})

// =====================
// 🔐 JWT
// =====================

function verificarToken(req, res, next){

    const token =
        req.headers.authorization

    if(!token){

        return res.status(401).json({

            mensaje:'Token requerido'
        })
    }

    try{

        const decoded = jwt.verify(

            token,

            process.env.JWT_SECRET
        )

        req.usuario = decoded

        next()

    }catch{

        res.status(401).json({

            mensaje:'Token inválido'
        })
    }
}

// =====================
// 🔐 LOGIN
// =====================

app.post('/login', async(req,res)=>{

    const {

        usuario,

        password

    } = req.body

    const user =
        await Usuario.findOne({

            usuario
        })

    if(!user){

        return res.status(404).json({

            mensaje:'Usuario no encontrado'
        })
    }

    const valido =
        await bcrypt.compare(

            password,

            user.password
        )

    if(!valido){

        return res.status(401).json({

            mensaje:'Contraseña incorrecta'
        })
    }

    const token = jwt.sign({

        id:user._id,

        rol:user.rol

    },

    process.env.JWT_SECRET)

    res.json({

        token,

        rol:user.rol,

        nombre:user.nombre
    })
})

// =====================
// 👑 CREAR ADMIN
// =====================

app.get('/crear-admin', async(req,res)=>{

    const existe =
        await Usuario.findOne({

            usuario:'admin'
        })

    if(existe){

        return res.json({

            mensaje:'Admin ya existe'
        })
    }

    const hash =
        await bcrypt.hash(

            'admin123',

            10
        )

    const admin =
        new Usuario({

            nombre:'Administrador',

            usuario:'admin',

            password:hash,

            rol:'admin'
        })

    await admin.save()

    res.json({

        mensaje:'Admin creado 🔥'
    })
})

// =====================
// 📚 CREAR MATERIA
// =====================

app.post('/materias',

verificarToken,

async(req,res)=>{

    const nueva =
    new Materia({

        nombre:req.body.nombre
    })

    await nueva.save()

    res.json({

        mensaje:'Materia creada 🔥'
    })
})

// =====================
// 📚 VER MATERIAS
// =====================

app.get('/materias',

verificarToken,

async(req,res)=>{

    const materias =
    await Materia.find()

    res.json(materias)
})

// =====================
// 👨‍🎓 CREAR ALUMNO
// =====================

app.post('/alumnos',

verificarToken,

async(req,res)=>{

    const nuevo =
    new Alumno({

        nombre:req.body.nombre,

        edad:req.body.edad
    })

    await nuevo.save()

    res.json(nuevo)
})

// =====================
// 👨‍🎓 VER ALUMNOS
// =====================

app.get('/alumnos',

verificarToken,

async(req,res)=>{

    const alumnos =
    await Alumno.find()

    res.json(alumnos)
})

// =====================
// 🏫 CREAR CLASE
// =====================

app.post('/clases',

verificarToken,

async(req,res)=>{

    const {

        materiaId,

        maestroId,

        grupo,

        horario,

        aula

    } = req.body

    const nueva =
    new Clase({

        materiaId,

        maestroId,

        grupo,

        horario,

        aula,

        alumnos:[]
    })

    await nueva.save()

    res.json({

        mensaje:'Clase creada 🔥'
    })
})

// =====================
// 🏫 VER CLASES
// =====================

app.get('/clases',

verificarToken,

async(req,res)=>{

    const clases =
    await Clase.find()

    res.json(clases)
})

// =====================
// 🚀 SERVER
// =====================

app.listen(process.env.PORT, ()=>{

    console.log(

        'Servidor corriendo 🔥'
    )
})