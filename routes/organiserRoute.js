const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

// Middleware to check if the user is logged in
const checkAuth = (req, res, next) => {
    if (!req.session.isLoggedIn) {
        // Redirects to organiser login page if there is no session found
        return res.redirect('/organiser/login');
    }
    next();
};

// Home page to show the settings/event records
router.get('/home', checkAuth, (req, res) => {
    const organiserId = Number(req.session.organiserId);

        // Select from settings table to display the organiser settings
        db.get('SELECT name, desc FROM settings WHERE organiser_id = ?', [organiserId], (err, organiserRow) => {
            if (err) {
                return res.status(500).render('error', { message: 'Database error: Organiser settings fetch failed' });
            }
             
            if (!organiserRow) {        
                return res.status(404).render('error', { message: 'User not found' });
            }
                
            const settings = {
            organiserName: organiserRow.name,
            organiserDesc: organiserRow.desc || 'My Event Page'
        };

        // Select all events from organiser
        db.all('SELECT * FROM event WHERE organiser_id = ?', [organiserId], (err, events) => {
            if (err) {
                return res.status(500).render('error', { message: 'Event fetch failed' });
            }

            // Filter the event based on status and map the eventIds
            const publishedEvent = events.filter(e => e.status === 'Publish');
            const draftEvent = events.filter(e => e.status === 'Draft');
            const eventIds = events.map(e => e.id);

            // Check if no events under organiser
            if (eventIds.length === 0) {
                return res.render('organiserHome', {
                    settings: settings,
                    publishedEvent: [],
                    draftEvent: [],
                    ticketMap: {} // Empty object for ticket grouping
                });
            }

            const placeholders = eventIds.map(() => '?').join(', ');
            const ticketQuery = `SELECT * FROM ticket WHERE event_id IN (${placeholders})`;

            // Select all tickets based on event ID
            db.all(ticketQuery, eventIds, (err, tickets) => {
                if (err) {
                    return res.status(500).render('error', { message: 'Database error: tickets fetch failed' });
                }

                // Group tickets by event_id
                const ticketMap = {};
                tickets.forEach(ticket => {
                    if (!ticketMap[ticket.event_id]) {
                        ticketMap[ticket.event_id] = [];
                    }
                    ticketMap[ticket.event_id].push(ticket);
                });

                // Render Home Page
                res.render('organiserHome', {
                    settings: settings,
                    publishedEvent: publishedEvent,
                    draftEvent: draftEvent,
                    ticketMap: ticketMap // This is now grouped by event_id
                });
            });
        });
    });
});

// Login Page
router.get('/login', (req, res) => {
    res.render("organiserLogin.ejs");
});

// Login Logic that takes in the username and password and authenticate the organiser
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM organiser WHERE username = ?', [username], (err, organiser) => {
        if (err || !organiser) {
            return res.status(500).render('error', { message: 'Invalid credentails'});
        }

        // Compares stored password with the entered password
        bcrypt.compare(password, organiser.password, (err, result) => {
            if (result) {
                req.session.isLoggedIn = true;
                req.session.organiserId = organiser.id;
                
                // Redirects to organiser home page after login success
                res.redirect('/organiser/home');
            } 
            
            else {
                return res.status(500).render('error', { message: 'Invalid credentails'});
            }
        });
    });
});

// Register Page
router.get("/register", (req, res) => {
    res.render("organiserRegister.ejs", {error: null});
});

// Register Logic that takes in the username and password and insert into database if username does not already exist in the table
router.post('/register', (req, res) => {
    const { username, password } = req.body;

    // Check if username already exists
    global.db.get('SELECT * FROM organiser WHERE username = ?', [username], (err, row) => {
        if (err) {
            return res.status(500).render('error', { message: 'Database error while checking username' });
        }

        if (row) {
            // Username already exists
            return res.status(400).render('organiserRegister', { error: 'Username already taken' });
        }

        // Hash password and create user
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                return res.status(500).render('error', { message: 'Error hashing password' });
            }

            // Create orgnaiser account by inserting password and username into organiser table
            global.db.run('INSERT INTO organiser (username, password) VALUES (?, ?)', [username, hashedPassword], function (err) {
                    if (err) {
                        return res.status(500).render('error', { message: 'Error creating user' });
                    }

                    const organiserId = this.lastID;

                    // Create default settings by inserting records into settings table
                    db.run('INSERT INTO settings (organiser_id, name, desc) VALUES (?, ?, ?)', [organiserId, username, 'My Event'], (err) => {
                            if (err) {
                                return res.status(500).render('error', { message: 'Error creating default settings' });
                            }

                            // Redirect to organiser login page after registeration is successful
                            res.redirect('/organiser/login');
                        }
                    );
                }
            );
        });
    });
});

// Settings Page that gets the settings record insert into the form
router.get('/settings', checkAuth, (req, res) => {
    const organiserID = Number(req.session.organiserId);

    // Get the settings from the database
    db.get('SELECT name, desc FROM settings WHERE organiser_id = ?', [organiserID], (err, row) => {
        if (err) {
            return res.status(500).render('error', { message: 'Database error'});
        }

        if (!row) {
            return res.status(404).render('error', { message: 'Organiser not found'});
        }

        const settings = {
            name: row.name,
            desc: row.desc || 'My Event Page'
        };

        // Renders the organiser settings page
        res.render('organiserSettings', { settings });
    });
});

// Settings Logic that takes in the name and description and updating settings table based on the organiser_id
router.post('/settings', checkAuth, (req, res) => {
    const { name, desc } = req.body;
    const organiserId = req.session.organiserId;

    // Update settings in the database
    db.run('UPDATE settings SET name = ?, desc = ? WHERE organiser_id = ?', [name, desc, organiserId], function(err) {
        if (err) {
            return res.render('error',{message:'Error updating settings'});
        }

        // Redirects to organiser home page after saving the new settings
        res.redirect('/organiser/home');
    });
}); 

// Create New Draft Page
router.get('/create', checkAuth, (req, res) => {
    const today = new Date().toISOString().substring(0, 10);

    res.render('createEvent', { event: null, todayDate: today});
});

// Create New Draft Logic that takes in the form inputs via req.body and creating an event using SQL query
router.post('/create', checkAuth, (req, res) => {
    const { title, content, date } = req.body;
    const organiserId = req.session.organiserId;

    // Inserting variables into event table
    db.run('INSERT INTO event (title, desc, organiser_id, status, date) VALUES (?, ?, ?, ?, ?)', [title, content, organiserId, 'Draft', date], function(err) {
        if (err) {
            return res.render('error', {message:'Error creating event'});
        } 

        // takes in last updated event_id from event table
        const eventId = this.lastID;

        // Redirect to ticket creation page for this event using eventID
        res.redirect("ticket/" + eventId);
    });
});

// Create Ticket Page that takes records from ticket table to show in the form
router.get('/ticket/:id', checkAuth, (req, res) => {
    const eventId = req.params.id;
    const allTypes = ['non-concession', 'concession', 'student'];
    const ticketArr = [];

    // Select all type from tickets based on eventId
    db.all('SELECT type from ticket where event_id = ?', [eventId], function(err, ticketType) {
        if (err) {
            return res.render('error', {message:'Error creating ticket'});
        }

        // If no ticket found will show error (An event is not suppose to have 0 type.)
        if (!ticketType) {
            return res.render('error', {message:'No ticket found'});
        }

        // Push all ticketType data into an array
        ticketType.forEach(ticket => {
            ticketArr.push(ticket.type);
        });

        // Filter the ticket list and remove types that already exist in the event (This is to prevent organiser from adding more than one of the same type of ticket by removing it from the selection)
        const filteredTypes = allTypes.filter(type => !ticketArr.includes(type));

        // Redirect to ticket creation page for this event
        res.render('createTicket', { 
            ticket: null, 
            event: eventId, 
            filteredTypes: filteredTypes 
        });
    });
});

// Add Ticket Logic that takes in the form inputs via req.body and inserting them into the database
router.post('/ticket/:id', checkAuth, (req, res) => {
    const { category, number, price } = req.body;
    const eventId = req.params.id;

    // Add ticket into database
    db.run('INSERT INTO ticket (type, event_id, price, amount) VALUES (?, ?, ?, ?)', [category, eventId, price, number], function(err) {
        if (err) {
            return res.render('error', {message:'Error creating ticket'});
        }

        // Redirects to the organier edit page after creating a new ticket
        res.redirect('/organiser/edit/' + eventId);
    });
});

// Create Edit Ticket Page that takes the records from the distinct ticket_id and event_id and putting it in the form
router.get('/editTicket/:id/:ticketId', checkAuth, (req, res) => {
    const eventId = req.params.id;
    const ticketId = req.params.ticketId;

    // Fetch all tickets that correspond wth eventId and ticketId
    db.get('SELECT * FROM ticket WHERE id = ? AND event_id = ?', [ticketId, eventId], (err, ticketType) => {
        if (err || !ticketType) {
            return res.render('error', {message:'There is no ticket entry for this event!'});
        }
        
        // Renders the edit ticket page
        res.render('editTicket', { 
            ticketType: ticketType, 
            event: eventId, 
            ticket: ticketId 
        }); 
    });
});

// Edit Ticket Logic takes in form input and updates the ticket based on it
router.post('/editTicket/:id/:ticketId', checkAuth, (req, res) => {
    const eventId = req.params.id;
    const ticketId = req.params.ticketId;
    const { price, number, category } = req.body;

    // updates the ticket information based on the ticket id and event id
    db.run('UPDATE ticket SET type = ?, amount = ?, price = ? WHERE id = ? and event_id = ?', [category, number, price, ticketId ,eventId], function(err) {
        if (err) {
            return res.render('error', {message:'Error updating ticket'});
        }

        // Redirect to organiser event page after successfully editing the ticket
        res.redirect('/organiser/edit/' + eventId);
    });
});

// Delete Event Logic
router.post('/deleteTicket/:id/:ticketId', checkAuth, (req, res) => {
    const ticketId = req.params.ticketId;
    const eventId = req.params.id;

    // Delete the ticket based on its id
    db.run('DELETE FROM ticket WHERE id = ?', [ticketId], function(err){
        if (err) {
            return res.render('error', {message:'deleting ticket'});
        }

        // Redirect to organiser edit event page after deleting ticket
        res.redirect('/organiser/edit/' + eventId);
    });
});


// Create edit Page
router.get('/edit/:id', checkAuth, (req, res) => {
    const eventId = req.params.id;
    const organiserId = req.session.organiserId;
    const today = new Date().toISOString().substring(0, 10); // 'YYYY-MM-DD'

    // Fetch all events that correspond with the eventId and organiserId
    db.get('SELECT * FROM event WHERE id = ? AND organiser_id = ?', [eventId, organiserId], (err, event) => {
        if (err || !event) {
            return res.render('error', {message:'You are not authorized to edit this event'});
        }

        // Fetch all ticket that correspond with eventId
        db.all('SELECT * FROM ticket WHERE event_id = ?', [eventId], (err, ticketType) => {
            if (err) {
                return res.status(500).render('error', { message: 'Database error: tickets fetch failed'});
            }
            
            // renders edit event page
            res.render('editEvent', { 
                error: null, 
                ticketType: ticketType, 
                event: event, 
                todayDate: today 
            }); 
        });
    });
});

// Edit Event Logic that takes in the new inputs via req.body and updating the database
router.post('/edit/:id', checkAuth, (req, res) => {
    const eventId = req.params.id;
    const { title, content, date } = req.body;

    // Count all the ticket type based on the event id
    db.get('SELECT COUNT(*) AS ticketCount FROM ticket WHERE event_id = ?', [eventId], (err, row) => {
        if (err) {
            return res.render('error', { message: 'Error checking tickets' });
        }

        // Checks if there is no ticket 
        if (row.ticketCount === 0) {
            // No tickets found, cancel update and show error on the application itself
            return db.all('SELECT * FROM ticket WHERE event_id = ?', [eventId], (err, ticketType) => {
                if (err) {
                    return res.render('error', {message:'loading tickets'});
                }

                return res.render('editEvent', { 
                    error: 'Cannot update event without tickets', 
                    event: { id: eventId, title, desc: content },
                    ticketType: ticketType
                });
            });
        }

        // Update event based on the eventId
        db.run('UPDATE event SET title = ?, desc = ?, last_modified = ?, date = ? WHERE id = ?', [title, content, new Date(), date, eventId], function(err) {
            if (err) {
                return res.render('error', {message:'Error updating article'});
            }

            // Redirects to organiser home page after updating
            res.redirect('/organiser/home');
        });
    });
});

// Publish Event Logic that updates the status of the event 
router.post('/publish/:id', checkAuth, (req, res) => {
    const eventId = req.params.id;
    const organiserId = req.session.organiserId;
    const today = new Date().toISOString().substring(0, 10); 

    // Update the article's status to 'Publish' based on the eventId and organiserId
    db.run('UPDATE event SET status = "Publish", published_date = ? WHERE id = ? AND organiser_id = ?', [today, eventId, organiserId], function(err) {
        if (err) {
            return res.render('error', {message:'Publishing event'});
        }

        // Redirect to organiser home page after publishing
        res.redirect('/organiser/home');
    });
});

// Delete Event Logic
router.post('/delete/:id', checkAuth, (req, res) => {
    const eventId = req.params.id;

    // Delete tickets based on eventId
    global.db.run('DELETE FROM ticket WHERE event_id = ?', [eventId], function(err) {
        if (err) {
            return res.render('error', {message:'deleting tickets'});
        }

        // Delete bookings based on eventId
        global.db.run('DELETE FROM bookings WHERE event_id = ?', [eventId], function(err) {
            if (err) {
                return res.render('error', {message:'deleting bookings'});
            }

            // Delete the entire event based on eventId
            db.run("DELETE FROM event WHERE id = ?", [eventId], function(err){
                if (err) {
                    return res.render('error', {message:'deleting event'});
                }
                
                // Redirects to organiser home page after deleting event
                res.redirect('/organiser/home');
            });
        });
    });
});

// Logout Logic
router.post('/logout', (req, res) => {
    // Destroy the session
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).render('error', {message:'Logout failed'});
        }

        // Redirect to the landing page after logging out
        res.redirect('/');
    });
});



// Export the router object so index.js can access it
module.exports = router;
