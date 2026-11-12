import 'dotenv/config';
import { query } from '../src/db.js';

const { rows } = await query('SELECT email, status FROM team_members');
console.log(rows);
process.exit(0);