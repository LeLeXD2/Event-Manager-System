
-- This makes sure that foreign_key constraints are observed and that errors will be thrown for violations
PRAGMA foreign_keys=ON;

BEGIN TRANSACTION;

-- Create your tables with SQL commands here (watch out for slight syntactical differences with SQLite vs MySQL)

CREATE TABLE "organiser" (
	"id"	INTEGER UNIQUE,
	"username"	TEXT NOT NULL,
	"password"	TEXT NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT)
);

CREATE TABLE "event" (
	"id"	INTEGER,
	"title"	TEXT NOT NULL,
	"desc"	TEXT NOT NULL,
	"organiser_id"	NUMERIC NOT NULL,
	"status"	TEXT NOT NULL,
	"date"	DATETIME NOT NULL,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"last_modified"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"views"	INTEGER DEFAULT 0,
	"published_date"	DATETIME,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("organiser_id") REFERENCES "organiser"("id")
);

CREATE TABLE "settings" (
	"id"	INTEGER,
	"organiser_id"	INTEGER NOT NULL,
	"name"	TEXT NOT NULL,
	"desc"	TEXT NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("organiser_id") REFERENCES "organiser"("id")
);

CREATE TABLE "ticket" (
	"id"	INTEGER,
	"type"	TEXT NOT NULL,
	"event_id"	INTEGER NOT NULL,
	"price"	INTEGER NOT NULL,
	"amount"	INTEGER NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("event_id") REFERENCES "event"("id")
);

CREATE TABLE "bookings" (
	"id"	INTEGER NOT NULL,
	"name"	INTEGER NOT NULL,
	"amount"	INTEGER NOT NULL,
	"type"	INTEGER NOT NULL,
	"event_id"	INTEGER NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("event_id") REFERENCES "event"("id")
);

COMMIT;

