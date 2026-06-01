self.addEventListener(

'install',

()=>{

    console.log(
        'CEPM instalado 🔥'
    )

})

self.addEventListener(

'push',

(event)=>{

    const data =
    event.data
    ?
    event.data.json()
    :
    {

        title:'CEPM',

        body:'Nuevo mensaje 💬'

    }

    event.waitUntil(

        self.registration
        .showNotification(

            data.title,

            {

                body:data.body,

                icon:'/icon-192.png',

                badge:'/icon-192.png'

            }

        )

    )

})

self.addEventListener(

'notificationclick',

(event)=>{

    event.notification.close()

    event.waitUntil(

        clients.openWindow('/')

    )

})