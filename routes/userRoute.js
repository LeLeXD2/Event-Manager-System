const express = require('express');
const router = express.Router();

// Attendee Home Page - Display all published articles
router.get('/home', (req, res) => {
    db.all('SELECT event.id AS eventId, event.title, event.date, settings.organiser_id, settings.name AS organiserName, settings.desc AS organiserDesc, SUM(ticket.amount) AS totalAvailableTickets FROM event JOIN settings ON event.organiser_id = settings.organiser_id LEFT JOIN ticket ON ticket.event_id = event.id WHERE event.status = "Publish" GROUP BY event.id HAVING totalAvailableTickets > 0', (err, events) => {
        if (err) {
            return res.status(500).render('error', { message: 'Database error 1' });
        }
        

        const organisers = {};

        events.forEach(event => {
            const organiserId = event.organiser_id;

            if (!organisers[organiserId]) {
            organisers[organiserId] = {
                name: event.organiserName,
                desc: event.organiserDesc,
                events: []
            };
            }

            organisers[organiserId].events.push({
                id: event.eventId,
                title: event.title,
                date: event.date
            });
        });

        for (const organiserId in organisers) {
            organisers[organiserId].events.sort((a, b) => new Date(a.date) - new Date(b.date));
        }

        // Renders the attendee home page
        res.render('user/Home.ejs', { organisers });
    });
});

// Individual Event Page for Attendee - Display article and bookings
router.get('/event/:id', (req, res) => {
    const eventId = req.params.id;

    // Increment views first
    db.run('UPDATE event SET views = views + 1 WHERE id = ? AND status = "Publish"', [eventId], (err) => {
        if (err) {
            console.error('Error updating views:', err);
        }

        // Fetch event after views increment
        db.get('SELECT * FROM event WHERE id = ? AND status = "Publish"', [eventId], (err, events) => {
            if (err || !events) {
                return res.status(404).render('error', { message: 'event not found or not published' });
            }

            // Fetch tickets based on eventId
            db.all('SELECT * FROM ticket WHERE event_id = ?', [eventId], (err, ticketType) => {
                if (err) {
                    return res.status(500).render('error', { message: 'Database error: tickets fetch failed'});
                }

                // Fetch bookings based on eventId
                db.all('SELECT * FROM bookings WHERE event_id = ?', [eventId], (err, booking) => {
                    if (err) {
                        return res.status(500).render('error', { message: 'bookings fetch failed'});
                    }
                    
                    // Renders attendee event page
                    res.render('user/eventPage.ejs', {
                        events,
                        organiserLoggedIn: req.session.isLoggedIn && req.session.organiserId,
                        ticketType,
                        booking
                    });
                });
            });
        });
    });
});

// Individual Event Page for Attendee Logic where they will update remaining ticket left and booking 
router.post('/event/:id', (req, res) => {
    const eventId = req.params.id;
    const { name, amount, category, ticket} = req.body;
    const remainder = ticket - amount

    // Checks if category is a string (1 ticket type)
    if (typeof category === 'string') {
        // Updating the ticket amount based on the event id and type
        db.run('UPDATE ticket SET amount = ? WHERE event_id = ? AND type = ?', [remainder, eventId, category], function(err) {
            if (err) {
                console.error('Update error:', err);
            } 
        });
        if (amount != 0) {
            // Insert booking details into bookings table
            db.run('INSERT INTO bookings (event_id, name, type, amount) VALUES (?, ?, ?, ?)', [eventId, name, category, amount], function(err) {
                if (err) {
                    return res.render('error', {message:'Error submitting booking'});
                }
            });
        }
    }
    // If category is an array (more than 1 ticket type)
    else {
        category.forEach((type, i) => {
            const total_book = amount[i];
            const total_ticket = ticket[i];

            // Update ticket amount
            db.run('UPDATE ticket SET amount = ? WHERE event_id = ? AND type = ?', [total_ticket-total_book, eventId, type], function(err) {
                if (err) {
                    console.error('Update error:', err);
                } 
            });
        });

        // Mapping the values for the next SQL query
        const values = category.map((type, i) => [eventId, name, type, amount[i]]);

        values.forEach((row, i) => {
            if (amount[i] != 0) {

                // Insert booking details into bookings table
                db.run('INSERT INTO bookings (event_id, name, type, amount) VALUES (?, ?, ?, ?)', row, function(err) {
                    if (err) {
                        return res.render('error', {message:'Error submitting booking'});
                    }
                });
            }
        });
    }

    // Redirects to attendee home after booking is successful
    res.redirect('/user/home');
});

// Export the router object so index.js can access it
module.exports = router;