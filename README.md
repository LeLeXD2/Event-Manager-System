### CM2040 Database Networks and the Web ###
### Product Description ###
An Event Management Web Application built with Express.js, bcrypt, express-session and sqlite3
enabling organiser to register, create, and manage events securely allowing attendees to book tickets using their name.

### Features ###
Organiser Registration and Login
Event Creation, Viewing, Editing, Deletion
Role-based Access (Event organiser and Attendee)
Database Integration with SQLite3
Secure route and Session
Error Handling and Input Validation

### Tech Stack ###
Backend: Node.js, Express.js
Database: SQLite
Authentication: Express-Session
Optional: bcrypt for password hashing

### Folder Structure ###
├── views/ # Contains all the ejs html pages <br>
├── routes/ # Express routes <br>
├── public/ # Contains all the css,fonts images and vendors <br>
├── index.js # Main Express app setup <br>
├── db_schema.sql # SQLite3 database <br>
|── README.md # Project documentation <br>
└── sqlite.exe # The sqlite3 program for the database <br>

#### Installation requirements ####

* NodeJS 
    - follow the install instructions at https://nodejs.org/en/
    - we recommend using the latest LTS version
* Sqlite3 
    - follow the instructions at https://www.tutorialspoint.com/sqlite/sqlite_installation.htm 
    - Note that the latest versions of the Mac OS and Linux come with SQLite pre-installed

#### Run these lines in the terminal ####

* Run ```npm install``` from the project directory to install all the node packages. (A node_modules folder will be created)

* Run ```npm run build-db``` to create the database on Mac or Linux 
or run ```npm run build-db-win``` to create the database on Windows (creates db_schema.sql file)

* Run ```npm run start``` to start serving the web app (Access via http://localhost:3000)

Test the app by browsing to the following routes:

* http://localhost:3000
* http://localhost:3000/user/home
* http://localhost:3000/organiser/login

You can also run: 
```npm run clean-db``` to delete the database on Mac or Linux before rebuilding it for a fresh start
```npm run clean-db-win``` to delete the database on Windows before rebuilding it for a fresh start

##### Creating database tables #####

* All database tables should created by modifying the db_schema.sql 
* This allows us to review and recreate your database simply by running ```npm run build-db```
* Do NOT create or alter database tables through other means
