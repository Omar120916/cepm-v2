require('dotenv').config()

const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const { type } = require('os')
const http = require('http')


const { Server } =
require('socket.io')
const webpush = require('web-push')

const app = express()

const server =
http.createServer(app)

const io =
new Server(server,{

    cors:{
        origin:'*'
    }
})

webpush.setVapidDetails(

    'mailto:admin@cepm.com',

    process.env.VAPID_PUBLIC_KEY,

    process.env.VAPID_PRIVATE_KEY

)

const suscripciones = []
const usuariosOnline = {}

// =====================
// 📁 CREAR CARPETA UPLOADS
// =====================

if(!fs.existsSync('uploads')){

    fs.mkdirSync('uploads')
}

// =====================
// 📤 MULTER
// =====================

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

// =====================
// 🔥 MIDDLEWARES
// =====================

app.use(cors())

app.use(express.json())

app.use(express.static('public'))

app.use(

    '/uploads',

    express.static(

        path.join(__dirname,'uploads')
    )
)

// =====================
// 🔥 MONGODB
// =====================

mongoose.connect(

    process.env.MONGO_URI

).then(()=>{

    console.log('Mongo conectado 🔥')

    console.log(
        process.env.MONGO_URI
    )

}).catch(err=>{

    console.log(err)
})

// =====================
// 📦 MODELOS
// =====================

const Usuario = mongoose.model('Usuario',{

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

const Materia = mongoose.model('Materia',{

    nombre:String
})

const Clase = mongoose.model('Clase',{

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

const Tarea = mongoose.model('Tarea',{

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

    tarde:Boolean,

    calificacion:{
        type: Number,
        default:null

    },

    revisada:{
        type:Boolean,
        default:false
    }

    
})

const Mensaje = mongoose.model('Mensaje',{

    emisorId:
    mongoose.Schema.Types.ObjectId,

    receptorId:
    mongoose.Schema.Types.ObjectId,

    texto:String,

    fecha:{
        type:Date,
        default:Date.now
    },

    leido:{
        type:Boolean,
        default:false
    }
})

const Aviso = mongoose.model('Aviso', {
    claseId:
    mongoose.Schema.Types.ObjectId,

    maestroId:
    mongoose.Schema.Types.ObjectId,

    titulo: String,

    mensaje: String,

    fecha:{
        type:Date,
        default:Date.now
    }


})

// =====================
// 🔐 TOKEN
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

function verificarDirector(req,res,next){

    if(req.usuario.rol !== 'director'){

        return res.status(403).json({

            mensaje:'Acceso exclusivo para directores'

        })

    }

    next()
}

// =====================
// 👑 VERIFICAR ADMIN
// =====================

function verificarAdmin(req,res,next){

    if(req.usuario.rol !== 'admin'){

        return res.status(403).json({

            mensaje:'Acceso exclusivo para administradores'

        })

    }

    next()
}

// =====================
// 🔐 index
// =====================

app.post('/index',

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
// 🏫 CREAR DIRECTOR
// =====================

app.post(

    '/crear-director',

    verificarToken,

    verificarAdmin,

    async(req,res)=>{

        try{

            const {

                nombre,
                usuario,
                password,
                email

            } = req.body


            const existe =
            await Usuario.findOne({

                usuario

            })


            if(existe){

                return res.status(400).json({

                    mensaje:
                    'El usuario ya existe'

                })

            }


            const hash =
            await bcrypt.hash(

                password,

                10

            )


            const director =
            new Usuario({

                nombre,

                usuario,

                password:hash,

                email,

                rol:'director'

            })


            await director.save()


            res.json({

                mensaje:
                'Director creado 🔥'

            })


        }catch(err){

            console.log(err)

            res.status(500).json({

                mensaje:
                'Error creando director'

            })

        }

    }

)

app.post('/registro',

async(req,res)=>{

    try{

        const {

            nombre,
            usuario,
            password,
            email,
            rol,
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
            email,
            rol,
            hijos:hijos || []

        })

        await nuevo.save()

        res.json({

            mensaje:'Usuario creado 🔥'
        })

    }catch(err){

        console.log(err)

        res.status(500).json({

            mensaje:'Error servidor'
        })
    }
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

    const nueva =
    new Clase({

        materiaId:req.body.materiaId,

        maestroId:req.body.maestroId,

        grupo:req.body.grupo,

        horario:req.body.horario,

        aula:req.body.aula,

        fechaInicio:req.body.fechaInicio,

        duracion:req.body.duracion,

        fechaFin:req.body.fechaFin,

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
// 👨‍🎓 AGREGAR ALUMNOS
// =====================

app.put('/clases/:id/alumnos',

verificarToken,

async(req,res)=>{

    await Clase.findByIdAndUpdate(

        req.params.id,

        {

            $addToSet:{

                alumnos:{

                    $each:req.body.alumnos
                }
            }
        }
    )

    res.json({

        mensaje:'Alumnos agregados 🔥'
    })
})

// =====================
// 📝 CALIFICACIONES
// =====================

app.post('/calificaciones',

verificarToken,

async(req,res)=>{

    const existe =
    await Calificacion.findOne({

        claseId:req.body.claseId,

        alumnoId:req.body.alumnoId,

        parcial:req.body.parcial
    })

    if(existe){

        return res.status(400).json({

            mensaje:'Ya calificado 🔥'
        })
    }

    const nueva =
    new Calificacion({

        claseId:req.body.claseId,

        alumnoId:req.body.alumnoId,

        parcial:req.body.parcial,

        calificacion:req.body.calificacion,

        bloqueada:true
    })

    await nueva.save()

    res.json({

        mensaje:'Calificación guardada 🔥'
    })
})

app.get('/calificaciones',

verificarToken,

async(req,res)=>{

    const calificaciones =
    await Calificacion.find()

    res.json(calificaciones)
})

// =====================
// 📚 TAREAS
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

app.get('/tareas',

verificarToken,

async(req,res)=>{

    const tareas =
    await Tarea.find()

    res.json(tareas)
})

app.delete(

    '/tareas/:id',

    verificarToken,

    async(req,res)=>{

        await Tarea.findByIdAndDelete(

            req.params.id
        )

        res.json({

            mensaje:
            'Tarea eliminada 🔥'
        })
})

app.put(

    '/tareas/:id',

    verificarToken,

    async(req,res)=>{

        const {

            titulo,

            descripcion,

            fechaEntrega

        } = req.body

        await Tarea.findByIdAndUpdate(

            req.params.id,

            {

                titulo,

                descripcion,

                fechaEntrega
            }
        )

        res.json({

            mensaje:
            'Tarea actualizada 🔥'
        })
})

// =====================
// 📤 ENTREGAR TAREA
// =====================

app.post(

    '/entregas',

    verificarToken,

    upload.single('archivo'),

    async(req,res)=>{

        try{

            const {

                tareaId,

                alumnoId

            } = req.body

            const tarea =
            await Tarea.findById(
                tareaId
            )

            if(!tarea){

                return res.status(404).json({

                    mensaje:'Tarea no encontrada'
                })
            }

            const fechaActual =
            new Date()

            const fechaLimite =
            new Date(
                tarea.fechaEntrega
            )

            if(fechaActual > fechaLimite){

                return res.status(400).json({

                    mensaje:
                    'Se te pasó la fecha 😭'
                })
            }

            if(!req.file){

                return res.status(400).json({

                    mensaje:
                    'Archivo requerido'
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

        }catch(err){

            console.log(err)

            res.status(500).json({

                mensaje:'Error servidor'
            })
        }
})

// =====================
// 📥 VER TODAS LAS ENTREGAS
// =====================

app.get(

    '/entregas',

    verificarToken,

    async(req,res)=>{

        const entregas =
        await Entrega.find()

        res.json(entregas)
    }
)

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

app.put(

    '/entregas/:id/calificar',

    verificarToken,

    async(req,res)=>{

        const {

            calificacion

        } = req.body

        await Entrega.findByIdAndUpdate(

            req.params.id,

            {

                calificacion,

                revisada:true
            }
        )

        res.json({

            mensaje:
            'Tarea calificada 🔥'
        })
})

// =====================
// 📅 ASISTENCIAS
// =====================

app.post('/asistencia',

verificarToken,

async(req,res)=>{

    const existe =
    await Asistencia.findOne({

        claseId:req.body.claseId,

        alumnoId:req.body.alumnoId,

        fecha:req.body.fecha
    })

    if(existe){

        return res.json({

            mensaje:'Ya tiene asistencia'
        })
    }

    const nueva =
    new Asistencia({

        claseId:req.body.claseId,

        alumnoId:req.body.alumnoId,

        fecha:req.body.fecha,

        estado:req.body.estado
    })

    await nueva.save()

    res.json({

        mensaje:'Asistencia guardada 🔥'
    })
})

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
// 💬 CHAT
// =====================

app.get(

'/mensajes/:usuario1/:usuario2',

verificarToken,

async(req,res)=>{

const mensajes =
await Mensaje.find({

$or:[

{
emisorId:req.params.usuario1,
receptorId:req.params.usuario2
},

{
emisorId:req.params.usuario2,
receptorId:req.params.usuario1
}

]

})

.sort({

fecha:1

})

res.json(mensajes)

})


app.post(

'/mensajes',

verificarToken,

async(req,res)=>{

const mensaje =
new Mensaje({

emisorId:req.body.emisorId,

receptorId:req.body.receptorId,

texto:req.body.texto

})

await mensaje.save()

io.to(

req.body.receptorId

).emit(

'nuevoMensaje',

mensaje

)

for(const sub of suscripciones){

try{

await webpush.sendNotification(

sub,

JSON.stringify({

title:'CEPM',

body:'Tienes un mensaje nuevo 💬'

})

)

}catch(err){

console.log(err)

}

}

res.json({

mensaje:'Enviado 🔥'

})

})

io.on(

'connection',

(socket)=>{

console.log(
'Usuario conectado 🔥'
)

socket.on(

'registrar',

(usuarioId)=>{

usuariosOnline[
usuarioId
] = true

socket.usuarioId =
usuarioId

socket.join(
usuarioId
)

io.emit(

'usuariosOnline',

Object.keys(
usuariosOnline
)

)

})

socket.on(

'disconnect',

()=>{

console.log(
'Usuario salió 😭'
)

if(
socket.usuarioId
){

delete usuariosOnline[
socket.usuarioId
]

io.emit(

'usuariosOnline',

Object.keys(
usuariosOnline
)

)

}

})

})

app.post(

'/suscribirse',

async(req,res)=>{

suscripciones.push(

req.body

)

res.json({

mensaje:'Suscripción guardada 🔥'

})

})

// =====================
// 📢 CREAR AVISO
// =====================

app.post(

'/avisos',

verificarToken,

async(req,res)=>{

    const aviso =
    new Aviso({

        claseId:req.body.claseId,

        maestroId:req.usuario.id,

        titulo:req.body.titulo,

        mensaje:req.body.mensaje

    })

    await aviso.save()

    res.json({

        mensaje:'Aviso publicado 🔥'

    })

})

// =====================
// 📢 VER AVISOS
// =====================

app.get(

'/avisos',

verificarToken,

async(req,res)=>{

    const avisos =
    await Aviso.find()

    .sort({

        fecha:-1

    })

    res.json(

        avisos

    )

})

// =====================
// 🗑 ELIMINAR AVISO
// =====================

app.delete(

'/avisos/:id',

verificarToken,

async(req,res)=>{

    await Aviso.findByIdAndDelete(

        req.params.id

    )

    res.json({

        mensaje:'Aviso eliminado'

    })

})

// =====================
// 🏫 DASHBOARD DIRECTOR
// =====================

app.get(

    '/director/resumen',

    verificarToken,

    verificarDirector,

    async(req,res)=>{

        try{

            const alumnos =
            await Usuario.countDocuments({
                rol:'alumno'
            })

            const maestros =
            await Usuario.countDocuments({
                rol:'maestro'
            })

            const padres =
            await Usuario.countDocuments({
                rol:'padre'
            })

            const materias =
            await Materia.countDocuments()

            const grupos =
            await Clase.distinct('grupo')

            const promedio =
            await Calificacion.aggregate([

                {
                    $group:{

                        _id:null,

                        promedio:{
                            $avg:'$calificacion'
                        }

                    }
                }

            ])

            const asistencias =
            await Asistencia.aggregate([

                {
                    $group:{

                        _id:null,

                        total:{
                            $sum:1
                        },

                        presentes:{

                            $sum:{

                                $cond:[

                                    {
                                        $in:[

                                            '$estado',

                                            [
                                                'presente',
                                                'Presente',
                                                'P',
                                                'asistio'
                                            ]

                                        ]
                                    },

                                    1,
                                    0

                                ]
                            }
                        }
                    }
                }

            ])

            const alumnosBajos =
            await Calificacion.aggregate([

                {
                    $group:{

                        _id:'$alumnoId',

                        promedio:{
                            $avg:'$calificacion'
                        }

                    }
                },

                {
                    $match:{

                        promedio:{
                            $lt:6
                        }

                    }
                },

                {
                    $count:'total'
                }

            ])

            const promedioGeneral =

                promedio.length

                ?

                Number(
                    promedio[0].promedio.toFixed(2)
                )

                : 0


            let porcentajeAsistencia = 0


            if(

                asistencias.length &&
                asistencias[0].total > 0

            ){

                porcentajeAsistencia =

                    Number(

                        (
                            asistencias[0].presentes /
                            asistencias[0].total
                        ) * 100

                    ).toFixed(1)

            }


            res.json({

                alumnos,

                maestros,

                padres,

                materias,

                grupos:grupos.length,

                promedioGeneral,

                porcentajeAsistencia,

                alumnosBajos:

                    alumnosBajos.length

                    ?

                    alumnosBajos[0].total

                    :

                    0

            })

        }catch(err){

            console.log(err)

            res.status(500).json({

                mensaje:
                'Error obteniendo resumen del director'

            })

        }

    }

)

// =====================
// 🚀 SERVER
// =====================

server.listen(

process.env.PORT,

()=>{

console.log(
'Servidor corriendo 🔥'
)

})