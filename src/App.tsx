import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, query, orderBy, 
  onSnapshot, deleteDoc, doc, where, serverTimestamp 
} from "firebase/firestore";
import { 
  getStorage, ref, uploadBytesResumable, getDownloadURL 
} from "firebase/storage";
import { 
  Folder, FileText, Plus, Trash2, ChevronRight, Home, 
  Settings, Save, X, Image as ImageIcon, Type, 
  List, AlertCircle, ChevronDown, RotateCw, UploadCloud, Loader2, Calendar
} from 'lucide-react';

// --- STYLES CSS ---
const customStyles = `
  .perspective-1000 { perspective: 1000px; }
  .transform-style-3d { transform-style: preserve-3d; }
  .backface-hidden { backface-visibility: hidden; }
  .rotate-y-180 { transform: rotateY(180deg); }
`;

// --- CONFIGURATION FIREBASE ---
// Utilisez import.meta.env.VITE_FIREBASE_API_KEY en local
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

// Initialisation sécurisée
let app, db, storage;
try {
  if (!firebaseConfig.apiKey) {
    console.warn("⚠️ Clé API Firebase manquante. Le mode démo sera activé.");
  }
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  storage = getStorage(app);
} catch (error) {
  console.error("Erreur init Firebase:", error);
}

// --- TYPES ---
type BlockType = 'h2' | 'text' | 'image' | 'callout' | 'flipcard' | 'accordion' | 'timeline';

interface TimelineItem {
  id: string;
  date: string;
  title: string;
  description: string;
}

interface Block {
  id: string;
  type: BlockType;
  content?: string;
  url?: string;
  subType?: 'info' | 'warn' | 'idea';
  front?: string;
  back?: string;
  title?: string;
  items?: TimelineItem[];
}

interface PageData {
  id: string;
  folderId: string;
  title: string;
  coverUrl?: string;
  blocks: Block[];
  createdAt: any;
}

interface FolderData {
  id: string;
  title: string;
}

// --- COMPOSANT PRINCIPAL ---
export default function App() {
  // Navigation State
  const [view, setView] = useState<'folders' | 'pages' | 'viewer' | 'editor'>('folders');
  const [currentFolder, setCurrentFolder] = useState<FolderData | null>(null);
  const [currentPage, setCurrentPage] = useState<PageData | null>(null);

  // Data State
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [pages, setPages] = useState<PageData[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [password, setPassword] = useState("");

  // Editor State
  const [editorBlocks, setEditorBlocks] = useState<Block[]>([]);
  const [editorTitle, setEditorTitle] = useState("");
  const [editorCover, setEditorCover] = useState("");

  // --- EFFETS (LISTENERS FIREBASE) ---
  
  // Charger les dossiers
  useEffect(() => {
    if (!firebaseConfig.apiKey) {
      setFolders([{ id: 'demo-folder', title: 'Dossier Démo (Mode Hors Ligne)' }]);
      setLoading(false);
      return;
    }

    if (!db) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, "folders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setFolders(snap.docs.map(d => ({ id: d.id, ...d.data() } as FolderData)));
      setLoading(false);
    }, (error) => {
      console.error("Erreur lecture dossiers:", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Charger les pages (CORRECTION ICI)
  useEffect(() => {
    if (!currentFolder) return;

    // Mode Démo
    if (!firebaseConfig.apiKey) {
      setPages([{
        id: 'demo-page',
        folderId: 'demo-folder',
        title: 'Exemple de Page Timeline',
        createdAt: { seconds: Date.now() / 1000 },
        blocks: [
          { 
            id: 'b1', 
            type: 'timeline', 
            items: [
              { id: 't1', date: '2023', title: 'Lancement', description: 'Début du projet.' },
              { id: 't2', date: '2024', title: 'Développement', description: 'Phase de codage intense.' }
            ]
          }
        ]
      } as PageData]);
      return;
    }

    if (!db) return;

    // CORRECTION : On a retiré orderBy("createdAt") ici pour éviter le besoin d'un index composite
    const q = query(collection(db, "pages"), where("folderId", "==", currentFolder.id));
    
    const unsub = onSnapshot(q, (snap) => {
      // On transforme les données
      const fetchedPages = snap.docs.map(d => ({ id: d.id, ...d.data() } as PageData));
      
      // On fait le tri en JavaScript côté client (plus robuste sans index)
      fetchedPages.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA; // Descendant (plus récent en premier)
      });
      
      setPages(fetchedPages);
    }, (error) => {
      // Ajout d'un log d'erreur explicite
      console.error("Erreur lecture pages:", error);
      alert("Erreur lors de la récupération des pages. Vérifiez la console (F12).");
    });
    return () => unsub();
  }, [currentFolder]);

  // MathJax Refresh
  useEffect(() => {
    if ((window as any).MathJax) {
      setTimeout(() => (window as any).MathJax.typesetPromise?.(), 100);
    }
  }, [view, currentPage, editorBlocks]);


  // --- ACTIONS NAVIGATION ---

  const goHome = () => {
    setView('folders');
    setCurrentFolder(null);
  };

  const openFolder = (folder: FolderData) => {
    setCurrentFolder(folder);
    setView('pages');
  };

  const openPage = (page: PageData) => {
    setCurrentPage(page);
    setView('viewer');
  };

  const startCreating = () => {
    setEditorBlocks([]);
    setEditorTitle("");
    setEditorCover("");
    setView('editor');
  };

  // --- ACTIONS FIREBASE ---

  const handleCreateFolder = async () => {
    const name = prompt("Nom du dossier ?");
    if (name) {
      if (!db || !firebaseConfig.apiKey) {
        alert("Action impossible en mode démo (configurez la clé API).");
        return;
      }
      try {
        await addDoc(collection(db, 'folders'), { title: name, createdAt: serverTimestamp() });
      } catch (e: any) {
        alert("Erreur création dossier: " + e.message);
      }
    }
  };

  const handleDelete = async (id: string, col: string) => {
    if (confirm("Supprimer définitivement ?")) {
      if (!db || !firebaseConfig.apiKey) {
        alert("Action impossible en mode démo.");
        return;
      }
      try {
        await deleteDoc(doc(db, col, id));
      } catch (e: any) {
        alert("Erreur suppression: " + e.message);
      }
    }
  };

  const handleSavePage = async () => {
    if (!firebaseConfig.apiKey) return alert("Mode Démo : La sauvegarde vers Firebase est désactivée sans clé API.");
    if (!db) return alert("Erreur connexion base de données.");
    
    if (!editorTitle) return alert("Veuillez ajouter un titre à la page !");
    if (!currentFolder) return alert("Aucun dossier sélectionné.");

    try {
      await addDoc(collection(db, 'pages'), {
        folderId: currentFolder.id,
        title: editorTitle,
        coverUrl: editorCover,
        blocks: editorBlocks,
        createdAt: serverTimestamp()
      });
      setView('pages');
    } catch (e: any) {
      console.error("Erreur sauvegarde:", e);
      alert(`Échec de la publication : ${e.message}\n\nVérifiez vos règles Firestore et votre connexion.`);
    }
  };

  const handleLogin = () => {
    if (password === "Formaeurs1") {
      setIsAdmin(true);
      setShowAuthModal(false);
    } else {
      alert("Mot de passe incorrect");
    }
  };

  // --- RENDERERS (VUES) ---

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      <style>{customStyles}</style>

      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 h-16 px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={goHome}>
          <div className="bg-violet-600 text-white p-2 rounded-lg shadow-sm shadow-violet-200">
            <RotateCw size={20} />
          </div>
          <span className="font-bold text-xl text-violet-900 tracking-tight">LearnFlow</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button onClick={goHome} className="hover:text-violet-600 flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-slate-50">
            <Home size={14} /> Bibliothèque
          </button>
          {currentFolder && (
            <>
              <ChevronRight size={14} className="text-slate-300" />
              <span className="font-semibold text-violet-600 bg-violet-50 px-2 py-1 rounded border border-violet-100">
                {currentFolder.title}
              </span>
            </>
          )}
        </div>

        <button 
          onClick={() => isAdmin ? setIsAdmin(false) : setShowAuthModal(true)}
          className={`p-2 rounded-full border transition-all ${isAdmin ? 'bg-violet-100 text-violet-600 border-violet-200' : 'bg-white text-slate-400 border-slate-200 hover:border-violet-400 hover:text-violet-500'}`}
        >
          <Settings size={20} />
        </button>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 overflow-y-auto">
        
        {/* BANNIÈRE MODE DÉMO */}
        {!firebaseConfig.apiKey && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl mb-6 flex items-center gap-3">
             <AlertCircle className="text-amber-600" />
             <div>
               <p className="font-bold">Mode Démonstration</p>
               <p className="text-sm">Aucune clé API Firebase détectée. L'application fonctionne en mode local simulé. La publication ne sera pas sauvegardée.</p>
             </div>
          </div>
        )}

        {/* VUE: LISTE DES DOSSIERS */}
        {view === 'folders' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {loading && <p className="text-slate-400 col-span-full text-center animate-pulse">Chargement...</p>}
            
            {folders.map(folder => (
              <div key={folder.id} 
                onClick={() => openFolder(folder)}
                className="group relative bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer flex flex-col gap-4"
              >
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 group-hover:bg-amber-100 transition-colors">
                  <Folder size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-800 group-hover:text-violet-700 transition-colors">{folder.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">Dossier</p>
                </div>
                {isAdmin && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(folder.id, 'folders'); }}
                    className="absolute top-3 right-3 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}

            {isAdmin && (
              <button 
                onClick={handleCreateFolder}
                className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-violet-500 hover:text-violet-600 hover:bg-violet-50 transition-all group"
              >
                <div className="p-2 rounded-full bg-slate-50 group-hover:bg-violet-100 transition-colors">
                  <Plus size={24} />
                </div>
                <span className="font-medium">Nouveau Dossier</span>
              </button>
            )}
          </div>
        )}

        {/* VUE: LISTE DES PAGES */}
        {view === 'pages' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {pages.length === 0 && <p className="col-span-full text-center text-slate-400 py-10">Ce dossier est vide.</p>}
            
            {pages.map(page => (
              <div key={page.id} 
                onClick={() => openPage(page)}
                className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer overflow-hidden flex flex-col h-64"
              >
                <div className="h-32 bg-slate-100 relative overflow-hidden group-hover:opacity-90 transition-opacity">
                  {page.coverUrl ? (
                    <img src={page.coverUrl} alt="cover" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-500 to-fuchsia-600 opacity-80" />
                  )}
                </div>
                <div className="p-5 flex-1 bg-white relative flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 line-clamp-2 group-hover:text-violet-700 transition-colors">{page.title}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    {page.createdAt?.seconds ? new Date(page.createdAt.seconds * 1000).toLocaleDateString() : 'Récemment'}
                  </p>
                </div>
                {isAdmin && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(page.id, 'pages'); }}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 text-slate-400 rounded-lg hover:bg-red-500 hover:text-white shadow-sm transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* VUE: LECTURE PAGE */}
        {view === 'viewer' && currentPage && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[80vh] overflow-hidden">
             {/* Cover */}
             {currentPage.coverUrl ? (
               <div className="h-64 w-full overflow-hidden relative">
                 <img src={currentPage.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
               </div>
             ) : (
                <div className="h-32 bg-slate-50 border-b border-slate-100"></div>
             )}
             
             <div className="p-8 sm:p-12 max-w-3xl mx-auto -mt-10 relative z-10">
               <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 mb-8">
                 <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">{currentPage.title}</h1>
               </div>

               <div className="space-y-8">
                 {currentPage.blocks.map(block => (
                   <BlockRenderer key={block.id} block={block} />
                 ))}
               </div>
             </div>
          </div>
        )}
      </main>

      {/* BOUTON FLOTTANT (FAB) */}
      {isAdmin && view === 'pages' && (
        <button 
          onClick={startCreating}
          className="fixed bottom-8 right-8 w-14 h-14 bg-violet-600 text-white rounded-full shadow-lg shadow-violet-600/30 flex items-center justify-center hover:scale-110 hover:bg-violet-700 transition-all duration-300 z-40 group"
        >
          <Plus size={28} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
      )}

      {/* MODAL AUTH */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center border border-slate-100">
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Accès Formateur</h3>
            <input 
              type="password" 
              placeholder="Mot de passe" 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all mb-4 text-center"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowAuthModal(false)} className="flex-1 py-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors font-medium">Annuler</button>
              <button onClick={handleLogin} className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200">Entrer</button>
            </div>
          </div>
        </div>
      )}

      {/* EDITEUR GAMMA (OVERLAY) */}
      {view === 'editor' && (
        <Editor 
          title={editorTitle} 
          setTitle={setEditorTitle}
          cover={editorCover}
          setCover={setEditorCover}
          blocks={editorBlocks} 
          setBlocks={setEditorBlocks} 
          onClose={() => setView('pages')} 
          onSave={handleSavePage} 
          storage={storage}
        />
      )}
    </div>
  );
}

// --- SOUS-COMPOSANTS ---

function BlockRenderer({ block }: { block: Block }) {
  const [flipped, setFlipped] = useState(false);
  const [open, setOpen] = useState(false);

  switch (block.type) {
    case 'h2':
      return <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-6 pb-2 border-b border-slate-100 flex items-center gap-3"><span className="w-2 h-8 bg-violet-500 rounded-full"></span>{block.content}</h2>;
    case 'text':
      return <div className="text-lg text-slate-600 leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: block.content || '' }} />;
    case 'callout':
      const colors = {
        info: 'bg-blue-50 border-blue-200 text-blue-900',
        warn: 'bg-amber-50 border-amber-200 text-amber-900',
        idea: 'bg-emerald-50 border-emerald-200 text-emerald-900'
      };
      return (
        <div className={`p-6 rounded-xl border flex gap-4 my-4 ${colors[block.subType || 'info']}`}>
          <AlertCircle className="shrink-0 mt-1 opacity-70" />
          <div className="text-base font-medium" dangerouslySetInnerHTML={{ __html: block.content || '' }} />
        </div>
      );
    case 'flipcard':
      return (
        <div className="h-64 w-full max-w-md mx-auto perspective-1000 cursor-pointer group my-8" onClick={() => setFlipped(!flipped)}>
          <div className={`relative w-full h-full duration-500 transform-style-3d transition-transform ${flipped ? 'rotate-y-180' : ''}`}>
            <div className="absolute inset-0 backface-hidden bg-white border-2 border-violet-100 rounded-2xl flex items-center justify-center p-8 text-center shadow-sm group-hover:shadow-lg group-hover:border-violet-300 transition-all">
              <span className="text-xl font-semibold text-slate-700">{block.front}</span>
              <span className="absolute bottom-4 text-xs text-slate-400 font-semibold uppercase tracking-widest">Retourner</span>
            </div>
            <div className="absolute inset-0 backface-hidden bg-violet-600 rounded-2xl rotate-y-180 flex items-center justify-center p-8 text-center shadow-xl text-white">
              <span className="text-xl font-medium">{block.back}</span>
            </div>
          </div>
        </div>
      );
    case 'accordion':
      return (
        <div className="border border-slate-200 rounded-xl overflow-hidden my-4">
          <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors text-left font-semibold text-slate-800">
            {block.title}
            <ChevronDown className={`transform transition-transform duration-300 text-slate-400 ${open ? 'rotate-180' : ''}`} />
          </button>
          <div className={`bg-slate-50 overflow-hidden transition-all duration-300 ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="p-4 border-t border-slate-200 text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: block.content || '' }} />
          </div>
        </div>
      );
    case 'timeline':
      // RENDERER AMÉLIORÉ POUR TIMELINE
      return (
        <div className="pl-4 border-l-2 border-slate-200 ml-3 space-y-8 py-4 relative my-8">
           {(block.items || []).map((item) => (
             <div key={item.id} className="relative group">
               {/* Point sur la ligne */}
               <div className="absolute -left-[23px] top-1.5 w-4 h-4 bg-white border-4 border-violet-300 rounded-full box-content group-hover:border-violet-600 transition-colors shadow-sm" />
               
               <div className="pl-4">
                 <div className="flex items-center gap-3 mb-1">
                   <span className="text-xs font-bold uppercase text-violet-600 bg-violet-50 px-2 py-0.5 rounded border border-violet-100">{item.date}</span>
                   <h4 className="font-bold text-slate-800">{item.title}</h4>
                 </div>
                 <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{item.description}</div>
               </div>
             </div>
           ))}
           {(block.items || []).length === 0 && <p className="text-slate-400 italic text-sm">Aucun événement dans la timeline.</p>}
        </div>
      );
    case 'image':
      return (
        <div className="my-6">
          <img src={block.url} alt="content" className="rounded-xl shadow-md w-full border border-slate-100" loading="lazy" />
        </div>
      );
    default:
      return null;
  }
}

// --- ÉDITEUR ---

function Editor({ title, setTitle, cover, setCover, blocks, setBlocks, onClose, onSave, storage }: any) {
  const [uploading, setUploading] = useState(false);

  const addBlock = (type: BlockType) => {
    const newBlock: Block = { id: Date.now().toString(), type };
    if (type === 'callout') newBlock.subType = 'info';
    if (type === 'timeline') newBlock.items = []; // Init timeline array
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id: string, field: keyof Block, value: any) => {
    setBlocks(blocks.map((b: Block) => b.id === id ? { ...b, [field]: value } : b));
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter((b: Block) => b.id !== id));
  };

  // --- LOGIQUE TIMELINE (Gestion des sous-éléments) ---
  const addTimelineItem = (blockId: string) => {
    const newItem: TimelineItem = {
      id: Date.now().toString(),
      date: '2024',
      title: 'Nouvel événement',
      description: 'Description...'
    };
    
    setBlocks(blocks.map((b: Block) => {
      if (b.id === blockId) {
        return { ...b, items: [...(b.items || []), newItem] };
      }
      return b;
    }));
  };

  const updateTimelineItem = (blockId: string, itemId: string, field: keyof TimelineItem, value: string) => {
    setBlocks(blocks.map((b: Block) => {
      if (b.id === blockId) {
        const newItems = (b.items || []).map(item => 
          item.id === itemId ? { ...item, [field]: value } : item
        );
        return { ...b, items: newItems };
      }
      return b;
    }));
  };

  const removeTimelineItem = (blockId: string, itemId: string) => {
    setBlocks(blocks.map((b: Block) => {
      if (b.id === blockId) {
        return { ...b, items: (b.items || []).filter(i => i.id !== itemId) };
      }
      return b;
    }));
  };

  // --- LOGIQUE UPLOAD ---
  const handleFileUpload = async (file: File) => {
    if (!file || !storage) return null;
    const storageRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    return new Promise<string>((resolve, reject) => {
      uploadTask.on('state_changed', 
        (snapshot) => { /* Progress */ },
        (error) => reject(error),
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        }
      );
    });
  };

  const onUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploading(true);
      try {
        const url = await handleFileUpload(e.target.files[0]);
        if (url) setCover(url);
      } catch (err) {
        alert("Erreur upload (Vérifiez Storage Rules ou Mode Démo)");
      } finally {
        setUploading(false);
      }
    }
  };

  const onUploadBlockImage = async (e: React.ChangeEvent<HTMLInputElement>, blockId: string) => {
    if (e.target.files && e.target.files[0]) {
      setUploading(true);
      try {
        const url = await handleFileUpload(e.target.files[0]);
        if (url) updateBlock(blockId, 'url', url);
      } catch (err) {
        alert("Erreur upload image");
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 z-50 flex overflow-hidden">
      {/* Sidebar Tools */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col h-full overflow-y-auto shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
        <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
          <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <Settings size={18} className="text-violet-500"/> Boîte à outils
          </h2>
        </div>
        
        <div className="p-4 space-y-6">
          <ToolSection title="Structure">
            <ToolButton icon={Type} label="Titre de Section" onClick={() => addBlock('h2')} />
            <ToolButton icon={FileText} label="Texte Riche" onClick={() => addBlock('text')} />
          </ToolSection>

          <ToolSection title="Interactif">
            <ToolButton icon={RotateCw} label="Flashcard" onClick={() => addBlock('flipcard')} />
            <ToolButton icon={List} label="Accordéon" onClick={() => addBlock('accordion')} />
            <ToolButton icon={Calendar} label="Timeline (Chronologie)" onClick={() => addBlock('timeline')} />
          </ToolSection>

          <ToolSection title="Visuel">
            <ToolButton icon={AlertCircle} label="Callout (Note)" onClick={() => addBlock('callout')} />
            <ToolButton icon={ImageIcon} label="Image" onClick={() => addBlock('image')} />
          </ToolSection>

          <div className="pt-6 mt-2 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Couverture</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="URL de l'image..." 
                className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-200 outline-none transition-all"
                value={cover}
                onChange={(e) => setCover(e.target.value)}
              />
              <label className={`p-2.5 bg-slate-100 rounded-lg cursor-pointer hover:bg-violet-100 hover:text-violet-600 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input type="file" hidden onChange={onUploadCover} accept="image/*" disabled={uploading} />
                {uploading ? <Loader2 className="animate-spin" size={20}/> : <UploadCloud size={20} />}
              </label>
            </div>
            {cover && (
              <div className="mt-3 rounded-lg overflow-hidden h-24 border border-slate-200 relative">
                <img src={cover} className="w-full h-full object-cover" alt="preview"/>
                <button onClick={() => setCover('')} className="absolute top-1 right-1 bg-white/90 p-1 rounded-md text-red-500 hover:bg-red-500 hover:text-white transition-colors"><X size={14}/></button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col h-full relative bg-slate-50/50">
        <div className="absolute top-6 right-8 flex gap-3 z-20">
          <button onClick={onClose} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium shadow-sm transition-all hover:shadow-md">Annuler</button>
          <button onClick={onSave} className="px-6 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 font-medium shadow-lg shadow-violet-200 flex items-center gap-2 transition-all hover:-translate-y-0.5">
            <Save size={18} /> Publier
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 sm:p-12">
          <div className="max-w-3xl mx-auto min-h-[90%] bg-white rounded-2xl shadow-sm p-12 border border-slate-200 relative">
            
            {/* Title Input */}
            <div className="group mb-12">
              <input 
                type="text" 
                placeholder="Titre de votre page..." 
                className="w-full text-4xl sm:text-5xl font-black text-slate-800 placeholder-slate-300 border-none focus:ring-0 outline-none bg-transparent"
                value={title}
                onChange={e => setTitle(e.target.value)}
                autoFocus
              />
              <div className="h-1 w-20 bg-violet-100 mt-4 rounded-full group-focus-within:bg-violet-500 group-focus-within:w-full transition-all duration-500"></div>
            </div>

            {/* Blocks */}
            <div className="space-y-6">
              {blocks.map((block: Block) => (
                <div key={block.id} className="group relative border-2 border-transparent hover:border-violet-100 hover:bg-violet-50/30 rounded-xl p-4 -mx-4 transition-all duration-200">
                  
                  {/* Controls */}
                  <div className="absolute -right-12 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                     <button onClick={() => removeBlock(block.id)} className="p-2 bg-white border border-slate-200 text-red-400 rounded-lg hover:text-red-600 hover:border-red-200 shadow-sm transition-colors" title="Supprimer"><Trash2 size={16}/></button>
                  </div>

                  {/* Editable Content */}
                  {block.type === 'h2' && (
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-8 bg-violet-300 rounded-full"></div>
                      <input 
                        className="w-full text-2xl font-bold text-slate-800 border-none focus:ring-0 outline-none bg-transparent placeholder-slate-300"
                        placeholder="Titre de section..."
                        value={block.content || ''} 
                        onChange={e => updateBlock(block.id, 'content', e.target.value)}
                      />
                    </div>
                  )}

                  {block.type === 'text' && (
                     <textarea 
                       className="w-full text-lg text-slate-600 resize-none border-none focus:ring-0 outline-none bg-transparent placeholder-slate-300 h-auto min-h-[5rem]"
                       placeholder="Commencez à écrire votre contenu ici..."
                       rows={3}
                       value={block.content || ''}
                       onChange={e => updateBlock(block.id, 'content', e.target.value)}
                     />
                  )}
                  
                  {block.type === 'callout' && (
                    <div className="flex gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <div className="shrink-0 pt-1">
                         <AlertCircle className="text-slate-400" />
                      </div>
                      <div className="flex-1">
                        <select 
                          className="text-xs bg-transparent border-none text-slate-400 font-bold uppercase mb-1 focus:ring-0 p-0 cursor-pointer hover:text-violet-600"
                          value={block.subType}
                          onChange={e => updateBlock(block.id, 'subType', e.target.value)}
                        >
                          <option value="info">Type: Information</option>
                          <option value="warn">Type: Attention</option>
                          <option value="idea">Type: Idée</option>
                        </select>
                        <input 
                          className="w-full bg-transparent border-none focus:ring-0 outline-none text-slate-700 font-medium"
                          placeholder="Écrivez votre message important..."
                          value={block.content || ''}
                          onChange={e => updateBlock(block.id, 'content', e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* NOUVEAU ÉDITEUR TIMELINE */}
                  {block.type === 'timeline' && (
                     <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                       <h3 className="font-bold text-slate-500 text-sm uppercase mb-4 flex items-center gap-2">
                         <Calendar size={16}/> Chronologie
                       </h3>
                       
                       <div className="space-y-4 pl-4 border-l-2 border-slate-200 ml-2">
                         {(block.items || []).map(item => (
                           <div key={item.id} className="relative bg-white p-4 rounded-xl border border-slate-200 shadow-sm group/item">
                             {/* Dot */}
                             <div className="absolute -left-[27px] top-6 w-3 h-3 bg-white border-2 border-slate-300 rounded-full box-content group-hover/item:border-violet-500 transition-colors" />
                             
                             {/* Inputs */}
                             <div className="grid grid-cols-[100px_1fr] gap-3 mb-2">
                               <input 
                                 className="text-xs font-bold uppercase text-violet-600 bg-violet-50 p-2 rounded border-none focus:ring-0 text-center"
                                 placeholder="DATE"
                                 value={item.date}
                                 onChange={e => updateTimelineItem(block.id, item.id, 'date', e.target.value)}
                               />
                               <input 
                                 className="font-bold text-slate-800 bg-transparent border-none focus:ring-0 p-2 placeholder-slate-300"
                                 placeholder="Titre de l'événement"
                                 value={item.title}
                                 onChange={e => updateTimelineItem(block.id, item.id, 'title', e.target.value)}
                               />
                             </div>
                             <textarea 
                               className="w-full text-sm text-slate-600 bg-transparent border-none focus:ring-0 resize-none p-2 placeholder-slate-300"
                               placeholder="Description détaillée..."
                               rows={2}
                               value={item.description}
                               onChange={e => updateTimelineItem(block.id, item.id, 'description', e.target.value)}
                             />
                             
                             <button 
                               onClick={() => removeTimelineItem(block.id, item.id)}
                               className="absolute top-2 right-2 text-slate-300 hover:text-red-500 p-1"
                             >
                               <X size={14}/>
                             </button>
                           </div>
                         ))}
                       </div>

                       <button 
                         onClick={() => addTimelineItem(block.id)}
                         className="mt-4 flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700 hover:bg-violet-50 px-3 py-2 rounded-lg transition-colors"
                       >
                         <Plus size={16}/> Ajouter un événement
                       </button>
                     </div>
                  )}

                  {block.type === 'flipcard' && (
                    <div className="flex gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                      <div className="flex-1 space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><RotateCw size={12}/> Recto (Question)</label>
                        <textarea className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:border-violet-300 focus:ring-2 focus:ring-violet-100 outline-none transition-all resize-none" rows={3} placeholder="Quelle est la capitale..." value={block.front || ''} onChange={e => updateBlock(block.id, 'front', e.target.value)} />
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><RotateCw size={12}/> Verso (Réponse)</label>
                        <textarea className="w-full p-3 bg-violet-50 border border-violet-100 rounded-xl focus:border-violet-300 focus:ring-2 focus:ring-violet-100 outline-none transition-all resize-none" rows={3} placeholder="La réponse est..." value={block.back || ''} onChange={e => updateBlock(block.id, 'back', e.target.value)} />
                      </div>
                    </div>
                  )}

                  {block.type === 'accordion' && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                      <div className="border-b border-slate-100 bg-slate-50 p-2">
                        <input className="w-full px-2 py-1 font-bold text-slate-800 bg-transparent border-none focus:ring-0 outline-none placeholder-slate-400" placeholder="Titre visible de l'accordéon..." value={block.title || ''} onChange={e => updateBlock(block.id, 'title', e.target.value)} />
                      </div>
                      <textarea className="w-full p-4 text-slate-600 bg-white border-none focus:ring-0 outline-none resize-none" placeholder="Contenu caché qui s'affichera au clic..." rows={3} value={block.content || ''} onChange={e => updateBlock(block.id, 'content', e.target.value)} />
                    </div>
                  )}

                  {block.type === 'image' && (
                    <div className="space-y-2">
                      {block.url ? (
                         <div className="relative group/img rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                           <img src={block.url} className="w-full" alt="uploaded"/>
                           <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                              <button onClick={() => updateBlock(block.id, 'url', '')} className="bg-white text-red-500 px-4 py-2 rounded-lg font-medium shadow-lg hover:bg-red-50 transition-colors">Changer l'image</button>
                           </div>
                         </div>
                      ) : (
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 flex flex-col items-center justify-center gap-4 hover:border-violet-300 hover:bg-violet-50/50 transition-all bg-slate-50">
                          {uploading ? <Loader2 className="animate-spin text-violet-500" size={32}/> : <UploadCloud className="text-slate-300" size={40}/>}
                          <div className="text-center">
                            <label className="text-violet-600 font-semibold cursor-pointer hover:underline">
                              Cliquez pour uploader une image
                              <input type="file" hidden onChange={(e) => onUploadBlockImage(e, block.id)} accept="image/*" />
                            </label>
                            <p className="text-slate-400 text-sm mt-1">PNG, JPG jusqu'à 5Mo</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ))}

              {blocks.length === 0 && (
                <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-300">
                    <Plus size={32} />
                  </div>
                  <div className="text-slate-400">
                    <p className="font-medium">Votre page est vide</p>
                    <p className="text-sm">Ajoutez des blocs depuis la barre latérale</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolSection({ title, children }: any) {
  return (
    <div className="mb-8">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ToolButton({ icon: Icon, label, onClick }: any) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 hover:shadow-md transition-all text-slate-600 group text-left">
      <div className="p-1.5 bg-slate-50 rounded-lg group-hover:bg-white text-slate-500 group-hover:text-violet-600 transition-colors">
        <Icon size={18} />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}