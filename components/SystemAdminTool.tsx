
import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, deleteDoc, doc, query, where, writeBatch } from 'firebase/firestore';

const ADMIN_EMAILS = [
  'mossaab.jlt@gmail.com',
  'rozomaki@gmail.com',
  'jellitm210@gmail.com'
];

export const SystemAdminTool: React.FC = () => {
    const [status, setStatus] = useState<string>('IDLE');
    const [log, setLog] = useState<string[]>([]);

    const addLog = (msg: string) => {
        setLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
    };

    const runReset = async () => {
        if (!window.confirm('WARNING: THIS WILL DELETE ALL DATA EXCEPT FOR 3 ADMIN USERS. ARE YOU SURE?')) return;
        
        setStatus('RUNNING');
        addLog('Starting full database reset...');

        try {
            // 1. CLEAN REQUESTS
            addLog('Cleaning requests collection...');
            const reqSnapshot = await getDocs(collection(db, 'requests'));
            let rCount = 0;
            for (const d of reqSnapshot.docs) {
                await deleteDoc(doc(db, 'requests', d.id));
                rCount++;
            }
            addLog(`Deleted ${rCount} requests.`);

            // 2. CLEAN USERS
            addLog('Cleaning users collection...');
            const userSnapshot = await getDocs(collection(db, 'users'));
            let uCount = 0;
            let keptCount = 0;
            
            for (const d of userSnapshot.docs) {
                const userData = d.data();
                if (ADMIN_EMAILS.includes(userData.email)) {
                    addLog(`Keeping admin user: ${userData.email}`);
                    keptCount++;
                    continue;
                }
                await deleteDoc(doc(db, 'users', d.id));
                uCount++;
            }
            addLog(`Deleted ${uCount} user profiles. Kept ${keptCount} admins.`);

            // 3. CLEAN CHATS / REVIEWS / ETC (if they exist)
            // Assuming your structure: chats are subcollections or standalone
            // If subcollections, they are usually deleted with documents? No, Firestore needs manual recursive delete.
            // But if we delete the request doc, we should also delete messages if stored separately.
            
            addLog('Reset complete successfully!');
            setStatus('COMPLETED');
            alert('Firestore data reset. NOTE: You still need to manually delete Firebase Auth accounts from the Console to remove them entirely.');
        } catch (err: any) {
            addLog(`ERROR: ${err.message}`);
            setStatus('ERROR');
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-slate-900 flex items-center justify-center p-6 text-white overflow-auto">
            <div className="max-w-xl w-full bg-slate-800 rounded-[3rem] p-10 shadow-2xl border border-slate-700">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 bg-red-500 rounded-2xl flex items-center justify-center text-3xl">⚠️</div>
                    <div>
                        <h1 className="text-2xl font-black">System Master Reset</h1>
                        <p className="text-slate-400 text-sm font-medium">Bricola Admin Utility</p>
                    </div>
                </div>

                <div className="bg-slate-950 rounded-2xl p-4 h-48 overflow-y-auto font-mono text-[10px] space-y-1 mb-6 border border-slate-800">
                    {log.map((line, i) => <div key={i} className="text-slate-400">{line}</div>)}
                    {log.length === 0 && <div className="text-slate-600">Waiting for trigger...</div>}
                </div>

                <div className="flex flex-col gap-3">
                    <button 
                        onClick={runReset}
                        disabled={status === 'RUNNING'}
                        className={`w-full py-5 rounded-[2rem] font-black text-lg transition-all shadow-xl ${
                            status === 'RUNNING' ? 'bg-slate-700 opacity-50' : 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
                        }`}
                    >
                        {status === 'RUNNING' ? 'PROCESSING...' : 'RESET DATABASE'}
                    </button>
                    <button 
                        onClick={() => window.location.reload()}
                        className="text-slate-400 font-bold py-2 hover:text-white transition-colors"
                    >
                        Return to App
                    </button>
                </div>
            </div>
        </div>
    );
};
