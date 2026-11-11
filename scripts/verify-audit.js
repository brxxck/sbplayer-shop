// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {db} from '../src/db.js';
import {verifyAudit} from '../src/audit.js';
const result=verifyAudit(db);
console.log(result.ok?`Audit chain verified: ${result.count} records.`:`Audit mismatch at record ${result.failedAt}. Verify database backups.`);
db.close();
if(!result.ok)process.exitCode=1;
