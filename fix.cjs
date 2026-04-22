const fs = require('fs');
let f = fs.readFileSync('components/MessageCenter.tsx', 'utf8');
let lines = f.split('\n');

// Clean up duplicate block
lines.splice(457, 11);

// Add the campaignReason block at line 449
const newBlock = `                                        {(patient as any).campaignReason && (
                                           <p className="text-[11px] text-indigo-700 font-bold bg-indigo-50 px-2 py-1 rounded-md mt-1 w-fit border border-indigo-100 line-clamp-2" title={(patient as any).campaignReason}>
                                              {(patient as any).campaignReason}
                                           </p>
                                        )}`;
lines.splice(449, 0, newBlock);

fs.writeFileSync('components/MessageCenter.tsx', lines.join('\n'), 'utf8');
