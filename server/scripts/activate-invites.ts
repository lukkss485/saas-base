import 'dotenv/config';
import { query } from '../src/db.js';

const { rowCount } = await query(
  `UPDATE team_members SET status = 'ativo' WHERE status = 'pendente'`
);
console.log(`Convites ativados: ${rowCount}`);
process.exit(0);