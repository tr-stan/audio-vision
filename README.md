# spotify-track-visualizer
A project to fetch data from Spotify's WEB API to visualize tracks, and set up a database to store user data

The ultimate goal of this project is to create a full-stack web application that fetches track audio analysis data from Spotify's WEB API and visualizes it on the front end based on the data it fetches. The users should be able to search songs and then store the visualization of their favorite tracks in the app.

The first step of the project will be to create a local database for storing user data. Data that will need to be stored includes:

Table: Users
- User id (primary key)
- User name
- User email

Table: Keys
- User id (foreign key)
- User password

Table: Saved Tracks <!-- users can go back to specific saved tracks to see the visualization for -->
- Track id : useful for fetching the track again?
- Track name
- Track Artist
- Track Album

Table: Playlists <!-- playlists can be created to queue up visualizations -->
- Queue
