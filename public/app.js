const socket = io();

const client = feathers();

client.configure(feathers.socketio(socket));
client.configure(feathers.authentication({
    storage: window.localStorage
}));

const loginHTML = `<main class="login container">
    <div class="row">
        <div class="col-12 col-6-tablet push-3-tablet text-center heading">
            <h1 class="font-100">Log in or signup</h1>
        </div>
    </div>
    <div class="row">
        <div class="col-12 col-6-tablet push3-tablet col-4-desktop push-4-desktop">
            <form class="form">
                <fieldset>
                    <input class="block" type="email" name="email" placeholder="email">
                </fieldset>
                <fieldset>
                    <input class="block" type="password" name="password" placeholder="password">
                </fieldset>
                <button type="button" id="signup" class="button button-primary block signup">
                    Sign up and log in
                </button>
            </form>
        </div>
    </div>
</main>`;

const chatHTML = `<main class="flex flex-column">
    <header class="title-bar flex flex-row flex-center">
        <div class="title-wrapper block center center-element">
            <img class="logo" src="http://feathersjs.com/img/feathers-logo-wide.png" alt="Feathers logo">
            <span class="title">Chat</span>
        </div>
    </header>
    <div class="flex flex-row flex-1 clear">
        <aside class="sidebar col col-3 flex flex-column flex-space-between">
            <header class="flex flex-row flex-center">
                <h4 class="font-300 text-center">
                    <span class="font-600 online-count">0</span> users
                </h4>
            </header>

            <ul class="flex flex-column flex-1 list-unstyled user-list"></ul>
            <footer class="flex flex-row flex-center">
                <a href="#" id="logout" class="button button-primary">
                    Sign Out
                </a>
            </footer>
        </aside>
        <div class="flex flex-column col col-9">
            <main class="chat flex flex-column flex-1 clear"></main>
            <form class="flex flex-row flex-space-between" id="send-message">
                <input type="text" name="text" class="flex flex-1">
                <button class="button-primary" type="submit">Send</button>
            </form>
        </div>
    </div>
</main>`;

const addUser = user => {
    const userList = document.querySelector('.user-list');

    if (userList) {
        userList.insertAdjacentHTML('beforeend', `<li>
            <a class="block relative" href="#">
                <img src="${user.avatar}" alt="" class="avatar">
                <span class="absolute username">${user.email}</span>
            </a>
        </li>`);
        const userCount = document.querySelectorAll('.user-list li').length;
        document.querySelector('.online-count').innerHTML = userCount;
    }
};

const addMessage = message => {
    const { user = {} } = message;
    const chat = document.querySelector('.chat');
    const text = message.text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;').replace(/>/g, '&gt;');

    if (chat) {
        chat.insertAdjacentHTML( 'beforeend', `<div class="message flex flex-row">
            <img src="${user.avatar}" alt="${user.email}" class="avatar">
            <div class="message-wrappter">
                <p class="message-header">
                    <span class="username font-600">${user.email}</span>
                    <span class="sent-date font-300">${moment(message.createdAt).format('MMM Do, hh:mm:ss')}</span>
                </p>
                <p class="message-content font-300">${text}</p>
            </div>
        </div>`);
        chat.scrollTop = chat.scrollHeight - chat.clientHeight;
    }
};

const showLogin = (error = {}) => {
    if(document.querySelectorAll('.login').length) {
        document.querySelector('.heading').insertAdjacentHTML('beforeend', `<p>There was an error: ${error.message}</p>`);
    } else {
        document.getElementById('app').innerHTML = loginHTML;
    }
};

const showChat = async () => {
    document.getElementById('app').innerHTML = chatHTML;

    const messages = await client.service('messages').find({
        query: {
            $sort: { createdAt: -1 },
            $limit: 25
        }
    });

    messages.data.reverse().forEach(addMessage);

    const users = await client.service('users').find();
    users.data.forEach(addUser);
};

const getCredentials = () => {
    const user = {
        email: document.querySelector('[name="email"]').value,
        password: document.querySelector('[name="password"]').value
    };
    return user;
};

const login = async credentials => {
    try {
        if(!credentials) {
            await client.authenticate();
        } else {
            const payload = Object.assign({ strategy: 'local'}, credentials);
            await client.authenticate(payload);
        }
        showChat();
    } catch(error) {
        showLogin(error);
    }
};

document.addEventListener('click', async ev => {
    switch(ev.target.id) {
        case 'signup': {
            const credentials = getCredentials();
            await client.service('users').create(credentials);
            await login(credentials);
            break;
        }
        case 'login': {
            const user = getCredentials();
            await login(user);
            break;
        }
        case 'logout': {
            await client.logout();
            document.getElementById('app').innerHTML = loginHTML;
            break;
        }
    }
});

document.addEventListener('submit', async ev => {
    if(ev.target.id === 'send-message') {
      // This is the message text input field
      const input = document.querySelector('[name="text"]');
  
      ev.preventDefault();
  
      // Create a new message and then clear the input field
      await client.service('messages').create({
        text: input.value
      });
  
      input.value = '';
    }
  });
  
  // Listen to created events and add the new message in real-time
  client.service('messages').on('created', addMessage);
  
  // We will also see when new users get created in real-time
  client.service('users').on('created', addUser);
  
  login();