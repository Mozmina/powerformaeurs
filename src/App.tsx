import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, query, orderBy, 
  onSnapshot, deleteDoc, doc, where, serverTimestamp, setDoc, getDocs, writeBatch 
} from "firebase/firestore";
import { 
  getStorage, ref, uploadBytesResumable, getDownloadURL 
} from "firebase/storage";
import { 
  Folder, FileText, Plus, Trash2, ChevronRight, Home, 
  Settings, Save, X, Image as ImageIcon, Type, 
  List, AlertCircle, ChevronDown, RotateCw, UploadCloud, Loader2, Calendar,
  Layout, Palette, Box, Maximize, Minimize, FileCode, File, 
  Bold, Italic, Heading, Calculator, Sigma, AlignLeft, AlignCenter, AlignRight,
  GripVertical, Users, Lock, CheckSquare, LogOut, Baseline, ArrowLeft
} from 'lucide-react';

// --- STYLES CSS ---
const customStyles = `
  .perspective-1000 { perspective: 1000px; }
  .transform-style-3d { transform-style: preserve-3d; }
  .backface-hidden { 
    backface-visibility: hidden; 
    -webkit-backface-visibility: hidden;
  }
  .rotate-y-180 { transform: rotateY(180deg); }
  
  .accordion-content { transition: grid-template-rows 0.3s ease-out; }
  .accordion-open { grid-template-rows: 1fr; }
  .accordion-closed { grid-template-rows: 0fr; }
  .accordion-inner { overflow: hidden; }

  mjx-container { outline: none !important; }

  [contenteditable]:empty:before {
    content: attr(placeholder);
    color: #94a3b8;
    cursor: text;
  }

  /* Drag & Drop Styles Simples */
  .draggable-item {
    transition: transform 0.2s ease, opacity 0.2s ease;
  }
  .draggable-item.dragging {
    opacity: 0.4;
    transform: scale(0.98);
    border: 2px dashed #7c3aed;
  }
  .draggable-item.drag-over {
    border-top: 3px solid #7c3aed;
  }
  
  /* Cursor styles */
  .cursor-grab { cursor: grab; }
  .cursor-grabbing { cursor: grabbing; }
`;

// --- CONFIGURATION FIREBASE ---
const apiKey = ""; 

const firebaseConfig = {
  apiKey: apiKey, 
  authDomain: "cartesmentalesrt.firebaseapp.com",
  projectId: "cartesmentalesrt",
  storageBucket: "cartesmentalesrt.firebasestorage.app",
  messagingSenderId: "254616841619",
  appId: "1:254616841619:web:ef0e2eb162c4c80d0c8c66",
  measurementId: "G-5Z7BVY12B9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// --- TYPES ---
type BlockType = 'h2' | 'text' | 'image' | 'callout' | 'flipcard' | 'accordion' | 'timeline' | 'embed' | 'pdf' | 'equation';
type BlockWidth = '100%' | '50%' | '33%';
type BlockShadow = 'none' | 'sm' | 'md' | 'xl';
type FontFamily = 'sans' | 'serif' | 'mono';
type FontSize = 'sm' | 'base' | 'lg' | 'xl' | '2xl';
type TextAlign = 'left' | 'center' | 'right';

interface TimelineItem { id: string; date: string; title: string; description: string; }
interface BlockStyle { 
  backgroundColor?: string; 
  textColor?: string;       
  shadow?: BlockShadow; 
  fontFamily?: FontFamily; 
  fontSize?: FontSize; 
  textAlign?: TextAlign; 
  isBold?: boolean; 
  isItalic?: boolean; 
}
interface Block { id: string; type: BlockType; content?: string; url?: string; subType?: 'info' | 'warn' | 'idea'; front?: string; back?: string; title?: string; items?: TimelineItem[]; width?: BlockWidth; style?: BlockStyle; }

interface Group { id: string; name: string; }
interface PageAssignment { id: string; groupId: string; pageId: string; }
interface PageData { id: string; folderId: string | null; title: string; coverUrl?: string; blocks: Block[]; createdAt: any; }
interface FolderData { id: string; title: string; parentId: string | null; createdAt: any; }

// --- HELPER CLASSES ---
const getWidthClass = (w?: BlockWidth) => w === '50%' ? 'w-full md:w-1/2' : w === '33%' ? 'w-full md:w-1/3' : 'w-full';
const getShadowClass = (s?: BlockShadow) => s === 'sm' ? 'shadow-sm' : s === 'md' ? 'shadow-md' : s === 'xl' ? 'shadow-xl shadow-slate-200' : 'shadow-none';

const getBgClass = (c?: string) => {
  switch(c) {
    case 'slate': return 'bg-slate-50 border-slate-200';
    case 'blue': return 'bg-blue-50 border-blue-200';
    case 'violet': return 'bg-violet-50 border-violet-200';
    case 'amber': return 'bg-amber-50 border-amber-200';
    case 'emerald': return 'bg-emerald-50 border-emerald-200';
    case 'rose': return 'bg-rose-50 border-rose-200';
    case 'white': return 'bg-white border-slate-100'; 
    default: 
      if (c && c.startsWith('#')) return 'border-transparent';
      return 'bg-white border-slate-100';
  }
};

const getFontClass = (f?: FontFamily) => f === 'serif' ? 'font-serif' : f === 'mono' ? 'font-mono' : 'font-sans';
const getSizeClass = (s?: FontSize) => s === 'sm' ? 'text-sm' : s === 'lg' ? 'text-lg' : s === 'xl' ? 'text-xl' : s === '2xl' ? 'text-2xl' : 'text-base';
const getAlignClass = (a?: TextAlign) => a === 'center' ? 'text-center' : a === 'right' ? 'text-right' : 'text-left';

const EditableText = ({ html, tagName, className, onChange, placeholder }: any) => {
  const contentEditableRef = useRef<HTMLElement>(null);
  const lastHtml = useRef(html);
  
  React.useLayoutEffect(() => {
    if (contentEditableRef.current && contentEditableRef.current.innerHTML !== html && document.activeElement !== contentEditableRef.current) {
      contentEditableRef.current.innerHTML = html;
    }
    lastHtml.current = html;
  }, [html]);

  const handleInput = (e: React.FormEvent<HTMLElement>) => {
    const newHtml = e.currentTarget.innerHTML;
    if (newHtml !== lastHtml.current) { onChange(newHtml); }
    lastHtml.current = newHtml;
  };

  return React.createElement(tagName, { 
    className, 
    contentEditable: true, 
    suppressContentEditableWarning: true, 
    onInput: handleInput, 
    onBlur: handleInput, 
    placeholder, 
    ref: contentEditableRef 
  });
};

// --- COMPOSANT PRINCIPAL ---
export default function App() {
  const [view, setView] = useState<'folders' | 'pages' | 'viewer' | 'editor' | 'admin_groups' | 'admin_assign'>('folders');
  const [currentFolder, setCurrentFolder] = useState<FolderData | null>(null);
  const [currentPage, setCurrentPage] = useState<PageData | null>(null);
  const [allFolders, setAllFolders] = useState<FolderData[]>([]);
  const [allPages, setAllPages] = useState<PageData[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [assignments, setAssignments] = useState<PageAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [password, setPassword] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [editorBlocks, setEditorBlocks] = useState<Block[]>([]);
  const [editorTitle, setEditorTitle] = useState("");
  const [editorCover, setEditorCover] = useState("");

  useEffect(() => {
    const unsubFolders = onSnapshot(query(collection(db, "folders"), orderBy("createdAt", "desc")), (snap) => setAllFolders(snap.docs.map(d => ({ id: d.id, ...d.data() } as FolderData))));
    const unsubPages = onSnapshot(collection(db, "pages"), (snap) => {
      const p = snap.docs.map(d => ({ id: d.id, ...d.data() } as PageData));
      p.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setAllPages(p);
    });
    const unsubGroups = onSnapshot(collection(db, "groups"), (snap) => setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as Group))));
    const unsubAssign = onSnapshot(collection(db, "assignments"), (snap) => { setAssignments(snap.docs.map(d => d.data() as PageAssignment)); setLoading(false); });
    return () => { unsubFolders(); unsubPages(); unsubGroups(); unsubAssign(); };
  }, []);

  const getVisibleContent = () => {
    if (isAdmin) return { folders: allFolders.filter(f => f.parentId === (currentFolder ? currentFolder.id : null)), pages: allPages.filter(p => p.folderId === (currentFolder ? currentFolder.id : 'root')) };
    if (!selectedGroup) return { folders: [], pages: [] };
    const allowedPageIds = assignments.filter(a => a.groupId === selectedGroup.id).map(a => a.pageId);
    const visiblePages = allPages.filter(p => p.folderId === (currentFolder ? currentFolder.id : 'root') && allowedPageIds.includes(p.id));
    const traverseAllowedFolderIds = new Set<string>();
    allPages.forEach(p => {
      if (allowedPageIds.includes(p.id)) {
        let fId = p.folderId;
        while (fId && fId !== 'root') {
          traverseAllowedFolderIds.add(fId);
          const folder = allFolders.find(f => f.id === fId);
          fId = folder ? folder.parentId : null;
        }
      }
    });
    const visibleFolders = allFolders.filter(f => f.parentId === (currentFolder ? currentFolder.id : null) && traverseAllowedFolderIds.has(f.id));
    return { folders: visibleFolders, pages: visiblePages };
  };

  const { folders: visibleFolders, pages: visiblePages } = getVisibleContent();

  const handleCreateFolder = async () => {
    const name = prompt("Nom du dossier ?");
    if (name) await addDoc(collection(db, 'folders'), { title: name, parentId: currentFolder ? currentFolder.id : null, createdAt: serverTimestamp() });
  };
  const handleToggleAssignment = async (groupId: string, pageId: string, isAssigned: boolean) => {
    const id = `${groupId}_${pageId}`;
    if (isAssigned) { const q = query(collection(db, "assignments"), where("groupId", "==", groupId), where("pageId", "==", pageId)); const snap = await getDocs(q); snap.forEach(d => deleteDoc(d.ref)); }
    else { await setDoc(doc(db, "assignments", id), { groupId, pageId }); }
  };
  const handleCreateGroup = async () => { const name = prompt("Nom du nouveau groupe ?"); if (name) await addDoc(collection(db, 'groups'), { name }); };
  const handleDelete = async (id: string, col: string) => { if (confirm("Supprimer définitivement ?")) await deleteDoc(doc(db, col, id)); };
  const handleSavePage = async () => {
    if (!editorTitle) return alert("Titre manquant !");
    try { await addDoc(collection(db, 'pages'), { folderId: currentFolder ? currentFolder.id : 'root', title: editorTitle, coverUrl: editorCover, blocks: editorBlocks, createdAt: serverTimestamp() }); setView('folders'); } 
    catch (e: any) { alert(`Erreur: ${e.message}`); }
  };

  if (!selectedGroup && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100">
          <div className="flex justify-center mb-6"><div className="bg-violet-600 text-white p-3 rounded-xl shadow-lg shadow-violet-200"><RotateCw size={32} /></div></div>
          <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">Bienvenue sur LearnFlow</h1>
          <p className="text-center text-slate-500 mb-8">Veuillez sélectionner votre groupe pour accéder au contenu.</p>
          <div className="space-y-3">{loading ? <p className="text-center text-slate-400">Chargement...</p> : groups.map(g => (<button key={g.id} onClick={() => setSelectedGroup(g)} className="w-full p-4 flex items-center justify-between bg-slate-50 hover:bg-violet-50 border border-slate-200 hover:border-violet-200 rounded-xl transition-all group"><span className="font-semibold text-slate-700 group-hover:text-violet-700">{g.name}</span><ChevronRight size={18} className="text-slate-300 group-hover:text-violet-400"/></button>))}</div>
          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center"><button onClick={() => setShowAuthModal(true)} className="text-sm text-slate-400 hover:text-violet-600 flex items-center gap-1"><Lock size={12}/> Accès Formateur</button></div>
        </div>
        {showAuthModal && (<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center"><h3 className="text-xl font-bold text-slate-800 mb-4">Identification</h3><input type="password" placeholder="Mot de passe" className="w-full px-4 py-3 rounded-xl border border-slate-200 mb-4 text-center" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if(e.key==='Enter') { if(password==="Formaeurs1"){setIsAdmin(true); setShowAuthModal(false);} else alert("Erreur"); } }} /><button onClick={() => setShowAuthModal(false)} className="text-slate-400 text-sm">Annuler</button></div></div>)}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      <style>{customStyles}</style>
      
      {/* HEADER - Caché en mode viewer */}
      {view !== 'viewer' && (
        <header className="bg-white border-b border-slate-200 h-16 px-6 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setView('folders'); setCurrentFolder(null); }}><div className="bg-violet-600 text-white p-2 rounded-lg"><RotateCw size={20} /></div><span className="font-bold text-xl text-violet-900 tracking-tight hidden sm:block">LearnFlow</span></div>
          <div className="flex items-center gap-2 text-sm text-slate-500 overflow-x-auto no-scrollbar max-w-[50vw]">
            <button onClick={() => { setView('folders'); setCurrentFolder(null); }} className="hover:text-violet-600 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-50 whitespace-nowrap"><Home size={14} /> Accueil</button>
            {currentFolder && <><ChevronRight size={14} className="text-slate-300 shrink-0" />{currentFolder.parentId && <span className="text-slate-400">...</span>}{currentFolder.parentId && <ChevronRight size={14} className="text-slate-300 shrink-0" />}<span className="font-semibold text-violet-600 bg-violet-50 px-2 py-1 rounded border border-violet-100 whitespace-nowrap">{currentFolder.title}</span></>}
          </div>
          <div className="flex items-center gap-2">{isAdmin ? <><button onClick={() => setView('admin_assign')} className={`p-2 rounded-lg text-sm font-medium ${view === 'admin_assign' ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-100'}`}>Attributions</button><button onClick={() => setView('admin_groups')} className={`p-2 rounded-lg text-sm font-medium ${view === 'admin_groups' ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-100'}`}>Groupes</button><button onClick={() => setIsAdmin(false)} className="p-2 text-slate-400 hover:text-red-500" title="Quitter Admin"><LogOut size={18}/></button></> : <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full"><Users size={14} className="text-slate-400"/><span className="text-xs font-bold text-slate-600">{selectedGroup?.name}</span><button onClick={() => setSelectedGroup(null)} className="ml-2 text-slate-400 hover:text-red-500"><X size={12}/></button></div>}</div>
        </header>
      )}

      {/* MODIFICATION ICI : Passage de max-w-7xl à max-w-[1920px] ou w-full avec une limite plus large pour écran 1080p */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-8 overflow-y-auto">
        {(view === 'folders' || view === 'pages') && (
          <div className="space-y-8">
            {isAdmin && <div className="flex justify-end gap-3"><button onClick={handleCreateFolder} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:border-violet-300 hover:text-violet-600 transition-colors"><Folder size={16} /> Nouveau Dossier</button><button onClick={() => { setEditorBlocks([]); setEditorTitle(""); setEditorCover(""); setView('editor'); }} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 shadow-lg shadow-violet-200 transition-colors"><Plus size={16} /> Nouvelle Page</button></div>}
            {visibleFolders.length > 0 && <div><h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Folder size={14}/> Dossiers</h3><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{visibleFolders.map(folder => (<div key={folder.id} onClick={() => { setCurrentFolder(folder); setView('folders'); }} className="group bg-white p-4 rounded-xl border border-slate-200 hover:border-violet-300 hover:shadow-md cursor-pointer transition-all flex items-center gap-4 relative"><div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center text-amber-500 group-hover:bg-amber-100"><Folder size={20} /></div><span className="font-medium text-slate-700 group-hover:text-violet-700 truncate flex-1">{folder.title}</span>{isAdmin && <button onClick={(e) => { e.stopPropagation(); handleDelete(folder.id, 'folders'); }} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>}</div>))}</div></div>}
            <div>{visibleFolders.length > 0 && visiblePages.length > 0 && <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 mt-8 flex items-center gap-2"><FileText size={14}/> Cartes Mentales</h3>}<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">{visiblePages.length === 0 && visibleFolders.length === 0 && <div className="col-span-full text-center py-20 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">Dossier vide ou accès restreint.</div>}{visiblePages.map(page => (<div key={page.id} onClick={() => { setCurrentPage(page); setView('viewer'); }} className="group bg-white rounded-xl border border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer overflow-hidden flex flex-col h-56 relative"><div className="h-28 bg-slate-100 relative overflow-hidden group-hover:opacity-90">{page.coverUrl ? <img src={page.coverUrl} alt="cover" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-violet-500 to-fuchsia-600 opacity-80" />}</div><div className="p-4 flex-1 flex flex-col justify-between"><h3 className="font-bold text-slate-800 line-clamp-2 text-sm">{page.title}</h3><div className="flex justify-between items-end"><span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">{new Date(page.createdAt?.seconds * 1000).toLocaleDateString()}</span></div></div>{isAdmin && <button onClick={(e) => { e.stopPropagation(); handleDelete(page.id, 'pages'); }} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-white shadow-sm"><Trash2 size={14} /></button>}</div>))}</div></div>
          </div>
        )}
        {isAdmin && view === 'admin_groups' && (<div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 shadow-sm"><h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Users className="text-violet-600"/> Gestion des Groupes</h2><div className="flex gap-2 mb-8"><button onClick={handleCreateGroup} className="flex-1 py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-violet-500 hover:text-violet-600 hover:bg-violet-50 font-medium transition-all flex items-center justify-center gap-2"><Plus size={20}/> Créer un groupe</button></div><div className="space-y-2">{groups.map(g => (<div key={g.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100"><span className="font-semibold text-slate-700">{g.name}</span><button onClick={() => handleDelete(g.id, 'groups')} className="text-slate-400 hover:text-red-500 p-2"><Trash2 size={16}/></button></div>))}</div></div>)}
        {isAdmin && view === 'admin_assign' && (<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"><div className="p-6 border-b border-slate-100 bg-slate-50/50"><h2 className="text-xl font-bold flex items-center gap-2"><CheckSquare className="text-violet-600"/> Attribution des Cartes Mentales</h2><p className="text-sm text-slate-500 mt-1">Cochez les cases pour rendre une carte visible à un groupe. Le chemin d'accès (dossiers) s'affichera automatiquement.</p></div><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200"><tr><th className="px-6 py-4 font-bold">Carte Mentale / Page</th>{groups.map(g => (<th key={g.id} className="px-6 py-4 text-center font-bold text-violet-700 bg-violet-50/30 border-l border-slate-200 min-w-[100px]">{g.name}</th>))}</tr></thead><tbody className="divide-y divide-slate-100">{allPages.map(page => (<tr key={page.id} className="hover:bg-slate-50/50"><td className="px-6 py-4 font-medium text-slate-800">{page.title}<div className="text-[10px] text-slate-400 font-normal mt-0.5">{allFolders.find(f => f.id === page.folderId)?.title || "Racine"}</div></td>{groups.map(g => { const isAssigned = assignments.some(a => a.groupId === g.id && a.pageId === page.id); return (<td key={g.id} className="px-6 py-4 text-center border-l border-slate-100"><input type="checkbox" checked={isAssigned} onChange={(e) => handleToggleAssignment(g.id, page.id, isAssigned)} className="w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer" /></td>); })}</tr>))}</tbody></table>{allPages.length === 0 && <div className="p-8 text-center text-slate-400">Aucune page à attribuer. Créez du contenu d'abord.</div>}</div></div>)}
        
        {/* VUE: VIEWER (Lecture) */}
        {view === 'viewer' && currentPage && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[90vh] overflow-hidden relative">
             <button onClick={() => setView('folders')} className="absolute top-6 left-6 z-30 p-2.5 bg-white/90 backdrop-blur-md border border-slate-200 rounded-full text-slate-600 hover:text-violet-600 hover:shadow-md transition-all shadow-sm group flex items-center gap-2" title="Retour">
               <ArrowLeft size={20} />
               <span className="text-sm font-medium hidden group-hover:inline-block transition-all pr-1">Retour</span>
             </button>
             {currentPage.coverUrl ? (
               <div className="h-64 w-full overflow-hidden relative">
                 <img src={currentPage.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
               </div>
             ) : null}
             
             {/* Largeur adaptative pour contenu */}
             <div className={`px-8 sm:px-12 pb-12 max-w-[1400px] mx-auto relative z-10 ${currentPage.coverUrl ? '-mt-16' : 'pt-24'}`}>
               {currentPage.coverUrl ? (
                 <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 mb-12">
                   <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">{currentPage.title}</h1>
                 </div>
               ) : (
                 <div className="mb-12 border-b border-slate-100 pb-8 pl-12">
                   <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight">{currentPage.title}</h1>
                 </div>
               )}
               <div className="flex flex-wrap -mx-3 items-stretch">
                 {currentPage.blocks.map(block => (
                   <div key={block.id} className={`${getWidthClass(block.width)} px-3 mb-6`}>
                      <BlockRenderer block={block} />
                   </div>
                 ))}
               </div>
             </div>
          </div>
        )}
        
        {/* VUE: EDITOR */}
        {view === 'editor' && (<Editor title={editorTitle} setTitle={setEditorTitle} cover={editorCover} setCover={setEditorCover} blocks={editorBlocks} setBlocks={setEditorBlocks} onClose={() => setView('folders')} onSave={handleSavePage} storage={storage} />)}
      </main>
    </div>
  );
}

// ... (BlockRenderer inchangé) ...
function BlockRenderer({ block }: { block: Block }) {
  const [flipped, setFlipped] = useState(false);
  const [open, setOpen] = useState(false);
  const bgClass = getBgClass(block.style?.backgroundColor);
  const isHexBg = block.style?.backgroundColor && block.style.backgroundColor.startsWith('#');
  const bgStyle = isHexBg ? { backgroundColor: block.style?.backgroundColor } : {};
  const shadowClass = getShadowClass(block.style?.shadow);
  const fontClass = getFontClass(block.style?.fontFamily);
  const sizeClass = getSizeClass(block.style?.fontSize);
  const alignClass = getAlignClass(block.style?.textAlign);
  const borderClass = (block.style?.backgroundColor && block.style.backgroundColor !== 'white') || isHexBg ? 'border-transparent' : 'border-slate-100';
  const textStyle = block.style?.textColor ? { color: block.style.textColor } : {};
  const containerClasses = `h-full rounded-2xl p-6 border ${bgClass} ${borderClass} ${shadowClass} ${fontClass} ${sizeClass} ${alignClass} transition-all duration-300 overflow-hidden`;
  
  const renderContent = () => {
    switch (block.type) {
      case 'h2': return <h2 className={`text-2xl font-bold text-slate-800 pb-2 border-b border-slate-200/50 flex items-center gap-3 ${alignClass === 'text-center' ? 'justify-center' : alignClass === 'text-right' ? 'justify-end' : ''}`} style={textStyle}><span className="w-2 h-8 bg-violet-500 rounded-full"></span>{block.content}</h2>;
      case 'text': return <div className="leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: block.content || '' }} style={textStyle} />;
      case 'equation': return <div className="flex flex-col items-center justify-center p-4 bg-slate-50/50 rounded-lg"><div className="text-lg">{`$$ ${block.content || ''} $$`}</div></div>;
      case 'callout': return <div className={`p-4 rounded-xl border flex gap-4 text-left ${block.subType === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-900' : block.subType === 'idea' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-blue-50 border-blue-200 text-blue-900'}`} style={textStyle}><AlertCircle className="shrink-0 mt-1 opacity-70" /><div className="font-medium" dangerouslySetInnerHTML={{ __html: block.content || '' }} /></div>;
      case 'flipcard': return <div className="h-64 w-full perspective-1000 cursor-pointer group" onClick={() => setFlipped(!flipped)}><div className={`relative w-full h-full duration-500 transform-style-3d transition-transform ${flipped ? 'rotate-y-180' : ''}`}><div className="absolute inset-0 backface-hidden bg-white border-2 border-violet-100 rounded-2xl flex items-center justify-center p-8 text-center shadow-sm group-hover:shadow-lg"><span className="text-xl font-semibold text-slate-700">{block.front}</span><span className="absolute bottom-4 text-xs text-slate-400 font-semibold uppercase tracking-widest">Retourner</span></div><div className="absolute inset-0 backface-hidden bg-violet-600 rounded-2xl rotate-y-180 flex items-center justify-center p-8 text-center shadow-xl text-white"><span className="text-xl font-medium">{block.back}</span></div></div></div>;
      case 'accordion': return <div className="border border-slate-200 rounded-xl overflow-hidden bg-white/60 shadow-sm hover:shadow-md transition-shadow text-left"><button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors text-left font-semibold text-slate-800">{block.title}<ChevronDown className={`transform transition-transform duration-300 text-slate-400 ${open ? 'rotate-180' : ''}`} /></button><div className={`grid accordion-content ${open ? 'accordion-open' : 'accordion-closed'}`}><div className="accordion-inner p-4 border-t border-slate-100 text-slate-600 leading-relaxed bg-slate-50/50"><div dangerouslySetInnerHTML={{ __html: block.content || '' }} /></div></div></div>;
      case 'timeline': return <div className="space-y-6 relative py-2 text-left"><div className="absolute left-[7px] top-4 bottom-4 w-0.5 bg-slate-200"></div>{(block.items || []).map((item) => (<div key={item.id} className="relative pl-8 group"><div className="absolute left-0 top-1.5 w-4 h-4 bg-white border-2 border-slate-300 rounded-full group-hover:border-violet-500 group-hover:scale-125 transition-all shadow-sm z-10" /><div><span className="inline-block text-xs font-bold uppercase text-violet-600 bg-violet-50 px-2 py-0.5 rounded border border-violet-100 mb-1">{item.date}</span><h4 className="font-bold text-slate-800">{item.title}</h4><div className="text-slate-600 text-sm leading-relaxed mt-1">{item.description}</div></div></div>))}</div>;
      case 'image': return <div className="rounded-xl overflow-hidden shadow-sm border border-slate-100"><img src={block.url} alt="content" className="w-full h-auto" loading="lazy" /></div>;
      case 'embed': return <div className="rounded-xl overflow-hidden shadow-sm border border-slate-100 bg-slate-100 relative aspect-video">{block.url ? <iframe src={block.url} className="absolute inset-0 w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Embed" /> : <div className="flex items-center justify-center h-full text-slate-400">Embed vide</div>}</div>;
      case 'pdf': return <div className="rounded-xl overflow-hidden shadow-sm border border-slate-100 h-[500px] bg-slate-50">{block.url ? <object data={block.url} type="application/pdf" className="w-full h-full"><div className="flex flex-col items-center justify-center h-full text-slate-500 p-4 text-center"><p className="mb-2">Impossible d'afficher le PDF.</p><a href={block.url} target="_blank" rel="noopener noreferrer" className="text-violet-600 underline font-medium">Télécharger</a></div></object> : <div className="flex items-center justify-center h-full text-slate-400">Aucun PDF</div>}</div>;
      default: return null;
    }
  };
  return <div className={containerClasses} style={bgStyle}>{renderContent()}</div>;
}

function Editor({ title, setTitle, cover, setCover, blocks, setBlocks, onClose, onSave, storage }: any) {
  const [uploading, setUploading] = useState(false);
  const [draggedBlockIndex, setDraggedBlockIndex] = useState<number | null>(null);

  const addBlock = (type: BlockType) => {
    const newBlock: Block = { id: Date.now().toString(), type, width: '100%', style: { backgroundColor: 'white', shadow: 'none', fontFamily: 'sans', fontSize: 'base', textAlign: 'left' } };
    if (type === 'callout') newBlock.subType = 'info';
    if (type === 'timeline') newBlock.items = [];
    setBlocks([...blocks, newBlock]);
  };
  const updateBlock = (id: string, updates: Partial<Block>) => setBlocks(blocks.map((b: Block) => b.id === id ? { ...b, ...updates } : b));
  const updateBlockStyle = (id: string, styleUpdates: Partial<BlockStyle>) => setBlocks(blocks.map((b: Block) => b.id === id ? { ...b, style: { ...b.style, ...styleUpdates } } : b));
  const removeBlock = (id: string) => setBlocks(blocks.filter((b: Block) => b.id !== id));

  // DnD logic - Modifiée pour n'autoriser le drag que si c'est la poignée qui est cliquée
  const handleDragStart = (e: React.DragEvent, index: number) => {
    // Vérifier si l'élément cible est bien le grip handle
    const target = e.target as HTMLElement;
    // Si on drag la poignée elle-même ou un de ses enfants
    if (target.dataset.dragHandle) {
      setDraggedBlockIndex(index);
      e.dataTransfer.effectAllowed = 'move';
    } else {
      e.preventDefault();
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => { 
    if (draggedBlockIndex === null) return;
    e.preventDefault(); 
    (e.currentTarget as HTMLElement).classList.add('drag-over'); 
  };
  const handleDragLeave = (e: React.DragEvent) => (e.currentTarget as HTMLElement).classList.remove('drag-over');
  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
    if (draggedBlockIndex === null || draggedBlockIndex === index) return;
    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(draggedBlockIndex, 1);
    newBlocks.splice(index, 0, moved);
    setBlocks(newBlocks);
    setDraggedBlockIndex(null);
  };

  const applyFormat = (cmd: string) => document.execCommand(cmd, false);
  const addTimelineItem = (bId: string) => setBlocks(blocks.map((b: Block) => b.id === bId ? { ...b, items: [...(b.items||[]), {id: Date.now().toString(), date:'2024', title:'Event', description:'...'}] } : b));
  const updateTimelineItem = (bId: string, iId: string, f: keyof TimelineItem, v: string) => setBlocks(blocks.map((b: Block) => b.id === bId ? { ...b, items: (b.items||[]).map(i => i.id === iId ? {...i, [f]: v} : i) } : b));
  const removeTimelineItem = (bId: string, iId: string) => setBlocks(blocks.map((b: Block) => b.id === bId ? { ...b, items: (b.items||[]).filter(i => i.id !== iId) } : b));
  const onUpload = async (file: File) => {
    if (!file || !storage) return null;
    const t = uploadBytesResumable(ref(storage, `uploads/${Date.now()}_${file.name}`), file);
    return new Promise<string>((res, rej) => t.on('state_changed', ()=>{}, rej, async () => res(await getDownloadURL(t.snapshot.ref))));
  };

  return (
    <div className="fixed inset-0 bg-slate-50 z-50 flex overflow-hidden">
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col h-full overflow-y-auto shrink-0 shadow-lg z-10">
        <div className="p-6 border-b border-slate-100"><h2 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Settings size={18} className="text-violet-500"/> Outils</h2></div>
        <div className="p-4 space-y-6">
          <ToolSection title="Structure"><ToolButton icon={Type} label="Titre H2" onClick={() => addBlock('h2')}/><ToolButton icon={FileText} label="Texte" onClick={() => addBlock('text')}/><ToolButton icon={Sigma} label="Maths" onClick={() => addBlock('equation')}/></ToolSection>
          <ToolSection title="Interactif"><ToolButton icon={RotateCw} label="Flashcard" onClick={() => addBlock('flipcard')}/><ToolButton icon={List} label="Accordéon" onClick={() => addBlock('accordion')}/><ToolButton icon={Calendar} label="Timeline" onClick={() => addBlock('timeline')}/></ToolSection>
          <ToolSection title="Médias"><ToolButton icon={ImageIcon} label="Image" onClick={() => addBlock('image')}/><ToolButton icon={FileCode} label="Embed" onClick={() => addBlock('embed')}/><ToolButton icon={File} label="PDF" onClick={() => addBlock('pdf')}/><ToolButton icon={AlertCircle} label="Callout" onClick={() => addBlock('callout')}/></ToolSection>
          <div className="pt-6 border-t"><label className="text-xs font-bold text-slate-400 uppercase">Cover (1920x480px recommandé)</label><div className="flex gap-2 mt-2"><input className="w-full text-sm p-2 border rounded" value={cover} onChange={e=>setCover(e.target.value)} placeholder="URL..."/><label className="p-2 bg-slate-100 rounded cursor-pointer"><input type="file" hidden onChange={async e=>{if(e.target.files?.[0]){setUploading(true); const u = await onUpload(e.target.files[0]); if(u) setCover(u); setUploading(false);}}} disabled={uploading}/><UploadCloud size={20}/></label></div></div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col h-full relative bg-slate-50/50">
        <div className="absolute top-6 right-8 flex gap-3 z-20"><button onClick={onClose} className="px-5 py-2.5 bg-white border rounded-xl shadow-sm">Annuler</button><button onClick={onSave} className="px-6 py-2.5 bg-violet-600 text-white rounded-xl shadow-lg flex gap-2"><Save size={18}/> Publier</button></div>
        <div className="flex-1 overflow-y-auto p-8 sm:p-12">
          <div className="max-w-[1600px] mx-auto min-h-[90%] bg-white rounded-2xl shadow-sm p-12 border border-slate-200 relative">
            <input className="w-full text-4xl font-black border-none focus:ring-0 bg-transparent mb-12" placeholder="Titre..." value={title} onChange={e=>setTitle(e.target.value)}/>
            <div className="flex flex-wrap -mx-3 items-start">
              {blocks.map((block: Block, index: number) => (
                <div key={block.id} className={`${getWidthClass(block.width)} px-3 mb-6 relative group transition-all duration-300 ${draggedBlockIndex === index ? 'dragging' : ''}`}
                  draggable={true} // Permet l'événement onDragStart
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e)=>handleDragOver(e, index)} onDragLeave={handleDragLeave} onDrop={(e)=>handleDrop(e, index)}
                >
                  <div className="absolute top-2 right-5 z-20 flex items-center gap-1 bg-white shadow-xl border rounded-xl p-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap max-w-[320px] justify-end">
                    {/* Poignée dédiée avec dataset */}
                    <div className="p-1.5 text-slate-300 cursor-grab border-r mr-1 active:cursor-grabbing" data-drag-handle="true"><GripVertical size={16} style={{pointerEvents: 'none'}} /></div>
                    {(block.type==='text'||block.type==='callout') && <><button onClick={()=>applyFormat('bold')} className="p-1.5 rounded hover:bg-slate-100"><Bold size={14}/></button><button onClick={()=>applyFormat('italic')} className="p-1.5 rounded hover:bg-slate-100"><Italic size={14}/></button>
                    {/* TEXT COLOR PICKER */}
                    <div className="relative group/color p-1.5 cursor-pointer rounded hover:bg-slate-100">
                      <Baseline size={14}/>
                      <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={(e) => updateBlockStyle(block.id, { textColor: e.target.value })} title="Couleur Texte"/>
                    </div>
                    <div className="w-px h-4 bg-slate-200 mx-1"></div></>}
                    <button onClick={()=>updateBlockStyle(block.id, {textAlign:'left'})} className="p-1.5 rounded hover:bg-slate-100"><AlignLeft size={14}/></button>
                    <button onClick={()=>updateBlockStyle(block.id, {textAlign:'center'})} className="p-1.5 rounded hover:bg-slate-100"><AlignCenter size={14}/></button>
                    <button onClick={()=>updateBlockStyle(block.id, {textAlign:'right'})} className="p-1.5 rounded hover:bg-slate-100"><AlignRight size={14}/></button>
                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                    <button onClick={()=>updateBlock(block.id, {width:'100%'})} className="p-1.5 rounded hover:bg-slate-100"><Maximize size={14}/></button>
                    <button onClick={()=>updateBlock(block.id, {width:'50%'})} className="p-1.5 rounded hover:bg-slate-100"><Layout size={14}/></button>
                    <button onClick={()=>updateBlock(block.id, {width:'33%'})} className="p-1.5 rounded hover:bg-slate-100"><Minimize size={14}/></button>
                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                    {['white','blue','violet','amber','emerald'].map(c=><button key={c} onClick={()=>updateBlockStyle(block.id, {backgroundColor:c})} className={`w-3 h-3 rounded-full border ${getBgClass(c)}`}></button>)}
                    {/* BACKGROUND COLOR PICKER */}
                    <div className="relative group/bg ml-1 cursor-pointer">
                      <div className="w-4 h-4 rounded-full border border-slate-300 bg-gradient-to-tr from-pink-300 to-blue-300 hover:scale-110 transition-transform"></div>
                      <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={(e) => updateBlockStyle(block.id, { backgroundColor: e.target.value })} title="Couleur Fond Perso"/>
                    </div>
                    <button onClick={()=>removeBlock(block.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded ml-1"><Trash2 size={14}/></button>
                  </div>
                  
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-8 p-2 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"><GripVertical size={20} /></div>

                  {/* APPLICATION DES STYLES CUSTOM (HEX) EN INLINE */}
                  <div className={`p-4 rounded-xl border-2 group-hover:border-violet-300 transition-all ${!block.style?.backgroundColor?.startsWith('#') ? getBgClass(block.style?.backgroundColor) : 'border-transparent'} ${getShadowClass(block.style?.shadow)} ${getAlignClass(block.style?.textAlign)}`}
                       style={{ 
                         backgroundColor: block.style?.backgroundColor?.startsWith('#') ? block.style.backgroundColor : undefined,
                         color: block.style?.textColor 
                       }}>
                    {block.type==='h2' && <input className={`w-full font-bold bg-transparent border-none focus:ring-0 ${getAlignClass(block.style?.textAlign)}`} value={block.content||''} onChange={e=>updateBlock(block.id, {content:e.target.value})} placeholder="Titre..." style={{ color: block.style?.textColor }}/>}
                    {block.type==='text' && <EditableText html={block.content||''} tagName="div" className="min-h-[5rem] outline-none" onChange={(val:string)=>updateBlock(block.id, {content:val})} placeholder="Texte..."/>}
                    {block.type==='callout' && <div className="flex gap-2"><AlertCircle className="shrink-0 text-slate-400"/><div className="flex-1"><select className="text-xs font-bold uppercase text-slate-400 mb-1" value={block.subType} onChange={e=>updateBlock(block.id, {subType:e.target.value as any})}><option value="info">Info</option><option value="warn">Warn</option><option value="idea">Idea</option></select><EditableText html={block.content||''} tagName="div" className="outline-none" onChange={(val:string)=>updateBlock(block.id, {content:val})} placeholder="Note..."/></div></div>}
                    {block.type==='timeline' && <div className="space-y-2">{(block.items||[]).map(i=><div key={i.id} className="flex gap-2 border p-2 rounded bg-white"><input className="w-20 font-bold text-violet-600 text-xs" value={i.date} onChange={e=>updateTimelineItem(block.id,i.id,'date',e.target.value)}/><div className="flex-1"><input className="w-full font-bold text-sm" value={i.title} onChange={e=>updateTimelineItem(block.id,i.id,'title',e.target.value)}/><textarea className="w-full text-xs resize-none" rows={1} value={i.description} onChange={e=>updateTimelineItem(block.id,i.id,'description',e.target.value)}/></div><button onClick={()=>removeTimelineItem(block.id,i.id)} className="text-slate-300 hover:text-red-500"><X size={14}/></button></div>)}<button onClick={()=>addTimelineItem(block.id)} className="text-xs text-violet-600 font-bold">+ Etape</button></div>}
                    {block.type==='image' && <div className="border-2 border-dashed p-4 text-center rounded-xl">{block.url ? <div className="relative"><img src={block.url} className="rounded w-full"/><button onClick={()=>updateBlock(block.id,{url:''})} className="absolute top-2 right-2 bg-white text-red-500 p-1 rounded shadow"><Trash2 size={14}/></button></div> : <label className="cursor-pointer text-slate-400 hover:text-violet-600"><UploadCloud size={24} className="mx-auto"/><span className="text-xs">Image</span><input type="file" hidden onChange={async e=>{if(e.target.files?.[0]){const u = await onUpload(e.target.files[0]); if(u) updateBlock(block.id,{url:u});}}} /></label>}</div>}
                    {['embed','pdf','flipcard','accordion','equation'].includes(block.type) && <div className="text-center text-slate-400 text-xs italic py-4 border rounded bg-slate-50">Éditeur simplifié pour {block.type}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolSection({ title, children }: any) { return <div className="mb-6"><h3 className="text-xs font-bold text-slate-400 uppercase mb-2 px-1">{title}</h3><div className="space-y-1">{children}</div></div>; }
function ToolButton({ icon: Icon, label, onClick }: any) { return <button onClick={onClick} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-violet-50 hover:text-violet-700 transition-all text-slate-600 text-left"><Icon size={16}/><span className="text-sm font-medium">{label}</span></button>; }