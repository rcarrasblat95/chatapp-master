const socket = io()

// Elements
const $messageForm = document.querySelector('#message-form')
const $chatBody = document.querySelector('.chat-body');
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')
const $sendLocationButton = document.querySelector('#send-location')
const $messages = document.querySelector('#messages')

// Templates
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

// query string
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true })

const $messageFormInput2 = document.querySelector('input[name=message]');

// Variable para mantener el temporizador del mensaje de "escribiendo"
let typingTimer;
let typingMessageElement; // Elemento del mensaje de "escribiendo"

// Función para mostrar el mensaje de "escribiendo"
const showTypingMessage = (username) => {
    // Si ya hay un mensaje de "escribiendo", elimínalo antes de mostrar uno nuevo
    if (typingMessageElement) {
        typingMessageElement.remove();
    }

    // Crear el HTML del mensaje de "escribiendo"
    const messageHTML = `
        <div class="message message-in typing-message">
            <div class="message-inner">
                <div class="message-body">
                    <div class="message-content">
                        <div class="message-text">
                            <p>${username} escribiendo ...</p>
                        </div>
                    </div>
                </div>
                <div class="message-footer">
                    <span class="extra-small text-muted">${moment().format('h:mm A')}</span>
                </div>
            </div>
        </div>`;

    // Agregar el HTML del mensaje de "escribiendo" al chat-body
    $messages.insertAdjacentHTML('beforeend', messageHTML);

    // Obtener el elemento del mensaje de "escribiendo"
    typingMessageElement = document.querySelector('.typing-message');

    // Hacer scroll automáticamente
    autoscroll();

    // Reiniciar el temporizador
    clearTimeout(typingTimer);

    // Configurar un temporizador para borrar el mensaje después de un cierto tiempo
    typingTimer = setTimeout(() => {
        // Borrar el mensaje de "escribiendo"
        if (typingMessageElement) {
            typingMessageElement.remove();
            typingMessageElement = null; // Restablecer la referencia al elemento
        }
    }, 300); // Cambiar el tiempo según tus necesidades
};

socket.on('typing', (username) => {
    // Muestra el mensaje de "escribiendo"
    showTypingMessage(username);
});




const autoscroll = () => {
    const $newMessage = $messages.lastElementChild;
    const newMessageStyles = getComputedStyle($newMessage);
    const newMessageMargin = parseInt(newMessageStyles.marginBottom);
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;
    const visibleHeight = $chatBody.offsetHeight; // Usamos $chatBody en lugar de $messages
    const containerHeight = $chatBody.scrollHeight; // Usamos $chatBody en lugar de $messages.scrollHeight

    // How far have I scrolled?
    const scrollOffset = $chatBody.scrollTop + visibleHeight;

    if (containerHeight - newMessageHeight <= scrollOffset) {
        $chatBody.scrollTop = $chatBody.scrollHeight;
    }
};

socket.on('message', (message) => {
    // Convertir el nombre de usuario actual a minúsculas
    const currentUser = username.toLowerCase();

    // Convertir el nombre de usuario del mensaje a minúsculas
    const messageUser = message.username.toLowerCase();

    // Determinar si el mensaje es del usuario actual
    const isCurrentUser = messageUser === currentUser;

    // Agregar una clase CSS basada en si el mensaje es del usuario actual
    const messageClass = isCurrentUser ? 'message message-out' : 'message';

    // Obtener la hora formateada
    const formattedTime = moment(message.createdAt).format('h:mm A');

    // Crear el HTML del mensaje
    const html = `
        <div class="${messageClass}">
            <div class="message-inner">
                <div class="message-body">
                    <div class="message-content">
                        <div class="message-text">
                        <p>${message.username}</p>
                            <p>${message.text}</p>
                        </div>
                    </div>
                </div>
                <div class="message-footer">
                    <span class="extra-small text-muted">${formattedTime}</span>
                </div>
            </div>
        </div>`;

    // Insertar el HTML del mensaje en el DOM
    $messages.insertAdjacentHTML('beforeend', html);

    // Hacer scroll automáticamente
    autoscroll();
});

// Insertar el nombre de la sala en el HTML
document.getElementById('roomName').innerText = room;


socket.on('locationMessage', (message) => {
    // Determinar si el mensaje es del usuario actual
    const isCurrentUser = message.username === username;

    // Agregar una clase CSS basada en si el mensaje es del usuario actual
    const messageClass = isCurrentUser ? 'message message-out' : 'message';

    // Obtener la hora formateada
    const formattedTime = moment(message.createdAt).format('h:mm A');

    // Crear el HTML del mensaje
    const html = `
        <div class="${messageClass}">
            <div class="message-inner">
                <div class="message-body">
                    <div class="message-content">
                        <div class="message-text">
                        <p>${user.username}</p>
                            <p><a href="${message.url}" target="_blank">Location shared</a></p>
                        </div>
                    </div>
                </div>
                <div class="message-footer">
                    <span class="extra-small text-muted">${formattedTime}</span>
                </div>
            </div>
        </div>`;

    // Insertar el HTML del mensaje en el DOM
    $messages.insertAdjacentHTML('beforeend', html);

    // Hacer scroll automáticamente
    autoscroll();
});


socket.on('roomData', ({ room, users }) => {
    const $sidebar = document.querySelector('#sidebar');

    // Limpiar contenido anterior del sidebar
    $sidebar.innerHTML = '';

    // Generar HTML para cada usuario y agregarlo al sidebar
    users.forEach(user => {
        const html = `
            <div  class="card border-0 text-reset">
                <div class="card-body">
                    <div class="row gx-5">
                        <div class="col">
                            <div class="d-flex align-items-center mb-3">
                                <h5 class="me-auto mb-0">${user.username}</h5>
                            </div>
                            <div class="d-flex align-items-center">
                                <div class="line-clamp me-auto">
                                    ${user.typing ? 'is typing<span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>' : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

        // Insertar HTML generado en el sidebar
        $sidebar.insertAdjacentHTML('beforeend', html);
    });
});

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault()

    $messageFormButton.setAttribute('disabled', 'disabled')

    const message = e.target.elements.message.value

    socket.emit('sendMessage', message, (error) => {
        $messageFormButton.removeAttribute('disabled')
        $messageFormInput.value = ''
        $messageFormInput.focus()

        if (error) {
            return console.log(error)
        }

        console.log('Message delivered!')
    })
})

$sendLocationButton.addEventListener('click', () => {
    if (!navigator.geolocation) {
        return alert('Geolocation is not supported by your browser.')
    }

    $sendLocationButton.setAttribute('disabled', 'disabled')

    navigator.geolocation.getCurrentPosition((position) => {
        socket.emit('sendLocation', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }, () => {
            $sendLocationButton.removeAttribute('disabled')
            console.log('Location shared!')
        })
    })
})

socket.emit('join', { username, room }, (error) => {
    if (error) {
        alert(error)
        location.href = '/'
    }
})