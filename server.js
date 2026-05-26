require('dotenv').config()

const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')


const multer = require('multer')

const fs = require('fs')

if(!fs.existsSync('uploads')){

    fs.mkdirSync('uploads')
}

const storage =
multer.diskStorage({

    destination:(req,file,cb)=>{

        cb(null,'uploads/')
    },

    filename:(req,file,cb)=>{

        cb(

            null,

            Date.now() +
            '-' +
            file.originalname
        )
    }
})

const upload =
multer({

    storage
})

const app = express()

// =====================
// 🔥 MIDDLEWARES
// =====================

app.use(cors())
app.use(express.json())
app.use(express.static('public'))

app.use(
    '/uploads',
    express.static('uploads')
)

// =====================
// 🔥 MONGODB
// =====================

mongoose.connect(process.env.MONGO_URI)

.then(()=>{

    console.log('Mongo conectado 🔥')

})

.catch(err=>{

    console.log(err)

})

// =====================
// 📦 MODELOS
// =====================

const Usuario = mongoose.model('Usuario', {

    nombre:String,

    usuario:String,

    password:String,

    rol:String,

    email:String,

    edad:String,

    alumnoId:
        mongoose.Schema.Types.ObjectId,

    hijos:[
        mongoose.Schema.Types.ObjectId
    ]
})

const Materia = mongoose.model('Materia', {

    nombre:String
})

const Clase = mongoose.model('Clase', {

    materiaId:
        mongoose.Schema.Types.ObjectId,

    maestroId:
        mongoose.Schema.Types.ObjectId,

    grupo:String,

    horario:String,

    aula:String,

    fechaInicio:String,

    duracion:Number,

    fechaFin:String,

    alumnos:[
        mongoose.Schema.Types.ObjectId
    ]
})

const Tarea = mongoose.model('Tarea', {

    claseId:
        mongoose.Schema.Types.ObjectId,

    titulo:String,

    descripcion:String,

    fechaEntrega:String
})

const Asistencia = mongoose.model('Asistencia',{

    claseId:
        mongoose.Schema.Types.ObjectId,

    alumnoId:
        mongoose.Schema.Types.ObjectId,

    fecha:String,

    estado:String
})

const Calificacion = mongoose.model('Calificacion',{

    claseId:
        mongoose.Schema.Types.ObjectId,

    alumnoId:
        mongoose.Schema.Types.ObjectId,

    parcial:Number,

    calificacion:Number,

    bloqueada:Boolean
})

const Entrega = mongoose.model('Entrega',{

    tareaId:
        mongoose.Schema.Types.ObjectId,

    alumnoId:
        mongoose.Schema.Types.ObjectId,

    archivo:String,

    fechaEntrega:String,

    tarde:Boolean
})

// =====================
// 🔐 JWT
// =====================

function verificarToken(req,res,next){

    const token =
    req.headers.authorization

    if(!token){

        return res.status(401).json({

            mensaje:'Token requerido'
        })
    }

    try{

        const decoded =
        jwt.verify(

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

app.post('/login',

async(req,res)=>{

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

    const token =
    jwt.sign({

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

app.get('/crear-admin',

async(req,res)=>{

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
// 👥 VER USUARIOS
// =====================

app.get('/usuarios',

verificarToken,

async(req,res)=>{

    const usuarios =
    await Usuario.find()

    res.json(usuarios)
})

// =====================
// 👨‍🎓 VER ALUMNOS
// =====================

app.get('/alumnos',

verificarToken,

async(req,res)=>{

    const alumnos =
    await Usuario.find({

        rol:'alumno'
    })

    res.json(alumnos)
})

// =====================
// 👨‍🏫 VER MAESTROS
// =====================

app.get('/maestros',

verificarToken,

async(req,res)=>{

    const maestros =
    await Usuario.find({

        rol:'maestro'
    })

    res.json(maestros)
})

// =====================
// 👨‍👩‍👧 VER PADRES
// =====================

app.get('/padres',

verificarToken,

async(req,res)=>{

    const padres =
    await Usuario.find({

        rol:'padre'
    })

    res.json(padres)
})

// =====================
// 👨‍🎓 CREAR ALUMNO
// =====================

app.post('/alumnos',

verificarToken,

async(req,res)=>{

    try{

        const {

            nombre,

            usuario,

            password,

            email,

            edad

        } = req.body

        const existe =
        await Usuario.findOne({

            usuario
        })

        if(existe){

            return res.status(400).json({

                mensaje:'Usuario ya existe'
            })
        }

        const hash =
        await bcrypt.hash(

            password,

            10
        )

        const nuevo =
        new Usuario({

            nombre,

            usuario,

            password:hash,

            rol:'alumno',

            email,

            edad
        })

        await nuevo.save()

        nuevo.alumnoId =
        nuevo._id

        await nuevo.save()

        res.json({

            mensaje:'Alumno creado 🔥'
        })

    }catch(err){

        console.log(err)

        res.status(500).json({

            mensaje:'Error servidor'
        })
    }
})

// =====================
// 👨‍🏫👨‍👩‍👧 REGISTRO
// =====================

app.post('/registro',

verificarToken,

async(req,res)=>{

    const {

        nombre,

        usuario,

        password,

        rol,

        email,

        edad,

        hijos

    } = req.body

    const existe =
    await Usuario.findOne({

        usuario
    })

    if(existe){

        return res.status(400).json({

            mensaje:'Usuario ya existe'
        })
    }

    const hash =
    await bcrypt.hash(

        password,

        10
    )

    const nuevo =
    new Usuario({

        nombre,

        usuario,

        password:hash,

        rol,

        email,

        edad,

        hijos
    })

    await nuevo.save()

    res.json({

        mensaje:'Usuario creado 🔥'
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

        aula,

        fechaInicio,

        duracion,

        fechaFin

    } = req.body

    const nueva =
    new Clase({

        materiaId,

        maestroId,

        grupo,

        horario,

        aula,

        fechaInicio,

        duracion,

        fechaFin,

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
// 👨‍🎓 AGREGAR ALUMNOS A CLASE
// =====================

app.put('/clases/:id/alumnos',

verificarToken,

async(req,res)=>{

    const claseId =
    req.params.id

    const alumnos =
    req.body.alumnos

    await Clase.findByIdAndUpdate(

        claseId,

        {

            $addToSet:{

                alumnos:{
                    $each: alumnos
                }
            }
        }
    )

    res.json({

        mensaje:'Alumnos agregados 🔥'
    })
})

// =====================
// 📝 GUARDAR CALIFICACION
// =====================

app.post('/calificaciones',

verificarToken,

async(req,res)=>{

    const {

        claseId,

        alumnoId,

        parcial,

        calificacion

    } = req.body

    const existe =
    await Calificacion.findOne({

        claseId,

        alumnoId,

        parcial
    })

    if(existe){

        return res.status(400).json({

            mensaje:'Ya calificado 🔥'
        })
    }

    const nueva =
    new Calificacion({

        claseId,

        alumnoId,

        parcial,

        calificacion,

        bloqueada:true
    })

    await nueva.save()

    res.json({

        mensaje:'Calificación guardada 🔥'
    })
})

// =====================
// 📖 VER CALIFICACIONES
// =====================

app.get('/calificaciones',

verificarToken,

async(req,res)=>{

    const calificaciones =
    await Calificacion.find()

    res.json(calificaciones)
})

// =====================
// 📝 CREAR TAREA
// =====================

app.post('/tareas',

verificarToken,

async(req,res)=>{

    const nueva =
    new Tarea({

        claseId:req.body.claseId,

        titulo:req.body.titulo,

        descripcion:req.body.descripcion,

        fechaEntrega:req.body.fechaEntrega
    })

    await nueva.save()

    res.json({

        mensaje:'Tarea creada 🔥'
    })
})

// =====================
// 📝 VER TAREAS
// =====================

app.get('/tareas',

verificarToken,

async(req,res)=>{

    const tareas =
    await Tarea.find()

    res.json(tareas)
})

app.post(

    '/entregas',

    verificarToken,

    upload.single('archivo'),

    async(req,res)=>{

        const {

            tareaId,

            alumnoId

        } = req.body

        const tarea =
        await Tarea.findById(
            tareaId
        )

        const fechaActual =
        new Date()

        const fechaLimite =
        new Date(
            tarea.fechaEntrega
        )

        // 🔥 BLOQUEAR TARDE

        if(fechaActual > fechaLimite){

            return res.status(400).json({

                mensaje:
                'Se te pasó la fecha 😭'
            })
        }

        const nueva =
        new Entrega({

            tareaId,

            alumnoId,

            archivo:req.file.filename,

            fechaEntrega:
            fechaActual,

            tarde:false
        })

        await nueva.save()

        res.json({

            mensaje:
            'Tarea entregada 🔥'
        })
})


// =====================
// 📥 VER ENTREGAS
// =====================

app.get(

    '/entregas/:tareaId',

    verificarToken,

    async(req,res)=>{

        const entregas =
        await Entrega.find({

            tareaId:req.params.tareaId
        })

        res.json(entregas)
})

// =====================
// 📅 GUARDAR ASISTENCIA
// =====================

app.post('/asistencia',

verificarToken,

async(req,res)=>{

    const {

        claseId,

        alumnoId,

        fecha,

        estado

    } = req.body

    const existe =
    await Asistencia.findOne({

        claseId,

        alumnoId,

        fecha
    })

    if(existe){

        return res.json({

            mensaje:'Ya tiene asistencia'
        })
    }

    const nueva =
    new Asistencia({

        claseId,

        alumnoId,

        fecha,

        estado
    })

    await nueva.save()

    res.json({

        mensaje:'Asistencia guardada 🔥'
    })
})

// =====================
// 📅 VER ASISTENCIAS
// =====================

app.get('/asistencia/:claseId',

verificarToken,

async(req,res)=>{

    const asistencias =
    await Asistencia.find({

        claseId:req.params.claseId
    })

    res.json(asistencias)
})

// =====================
// 🚀 SERVER
// =====================

app.listen(process.env.PORT, ()=>{

    console.log(

        'Servidor corriendo 🔥'
    )
})