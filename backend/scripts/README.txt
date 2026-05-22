NexaReach Global CSV Tools

1. Put generate_all_global_csvs.js here:
   D:\ShazeeProjects\nexareach-ai\backend\scripts\generate_all_global_csvs.js

2. Make sure generate_global_csv.js already exists in the same scripts folder.

3. In backend/package.json add:
   "generate:all": "node scripts/generate_all_global_csvs.js"

4. Run:
   cd D:\ShazeeProjects\nexareach-ai\backend
   npm run generate:all

5. CSV files will appear here:
   D:\ShazeeProjects\nexareach-ai\backend\data

Note:
These CSVs are generated from live OpenStreetMap/Overpass data on your laptop.
Some places will not have phone numbers, so they will show as Needs Phone.
