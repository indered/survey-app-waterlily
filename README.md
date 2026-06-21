# survey-app-waterlily

Tiny MERN bootstrap with a Vite React client and an Express API.

## Scripts

- `npm run client` starts Vite on port `3001`.
- `npm run server` starts Express on port `3000`.
- `npm run build` builds the client.
- `npm start` starts the production Express server.

Set `MONGODB_URI` before starting the server if you want the POST route to write data.


## Steps to test

- ACCESS the app at https://survey-app-waterlily.onrender.com/
- It will take two minutes to boot the app since it is free version of render
- Login with admin creds -> email: admin@waterlily.com, pass: 1234546
- create a survey
- copy survey link and paste in incognito tab or simply logout and then paste it in same tab
- signup with another user
- fill in the survey
- review the survey
- submit the survey

## Things went well

- I was able to add a clean backend architecture 
- It does all the basic auth, survey creation, role checks, and survey submissions
- I have added nice to haves too

## Things could have went well

- FE was built in a bit of haste
- I was confused by the extent of the AI tools i can use. I am an avid user so I tend to use claude plan mode and do development without manual coding from last 6 months.
- I could not add proper e2e test cases for backend and FE because of lack of time.

