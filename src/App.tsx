import React, { useState, useEffect, useRef } from 'react';
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
  List, AlertCircle, ChevronDown, RotateCw, UploadCloud, Loader2, Calendar,
  Layout, Palette, Box, Maximize, Minimize, FileCode, File, 
  Bold, Italic, Heading, Calculator, Sigma, AlignLeft, AlignCenter, AlignRight,
  GripVertical
} from 'lucide-react';

// --- STYLES CSS ---
const customStyles = `
  .perspective-1000 { perspective: 1000px; }
  .transform-style-3d { transform-style: preserve-3d; }
  .backface-hidden { backface-visibility: hidden; }
  .rotate-y-180 { transform: rotateY(180deg); }
  
  /* Animation Accordéon */
  .accordion-content { transition: grid-template-rows 0.3s ease-out; }
  .accordion-open { grid-template-rows: 1fr; }
  .accordion-closed { grid-template-rows: 0fr; }
  .accordion-inner { overflow: hidden; }

  /* MathJax Display fix */
  mjx-container { outline: none !important; }

  /* Content Editable Placeholder */
  [contenteditable]:empty:before {
    content: attr(placeholder);
    color: #94a3b8;
    cursor: text;
  }

  /* Drag & Drop Styles */
  .drag-over {
    border-top: 3px solid #7c3aed !important; /* Violet-600 */
    transition: border 0.1s ease;
  }
  .dragging {
    opacity: 0.5;
    background-color: #f3f4f6;
  }
`;

// --- CONFIGURATION FIREBASE ---
// En local sur votre machine, décommentez la ligne ci-dessous :
// const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || "";
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

// Initialisation directe
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// --- TYPES ---
type BlockType = 'h2' | 'text' | 'image' | 'callout' | 'flipcard' | 'accordion' | 'timeline' | 'embed' | 'pdf' | 'equation';
type BlockWidth = '100%' | '50%' | '33%';
type BlockShadow = 'none' | 'sm' | 'md' | 'xl';
type BlockColor = 'white' | 'slate' | 'blue' | 'violet' | 'amber' | 'emerald' | 'rose';
type FontFamily = 'sans' | 'serif' | 'mono';
type FontSize = 'sm' | 'base' | 'lg' | 'xl' | '2xl';
type TextAlign = 'left' | 'center' | 'right';

interface TimelineItem {
  id: string;
  date: string;
  title: string;
  description: string;
}

interface BlockStyle {
  backgroundColor?: BlockColor;
  shadow?: BlockShadow;
  fontFamily?: FontFamily;
  fontSize?: FontSize;
  textAlign?: TextAlign;
  isBold?: boolean;
  isItalic?: boolean;
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
  width?: BlockWidth;
  style?: BlockStyle;
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

// --- HELPER CLASSES ---
const getWidthClass = (width?: BlockWidth) => {
  switch(width) {
    case '50%': return 'w-full md:w-1/2';
    case '33%': return 'w-full md:w-1/3';
    default: return 'w-full';
  }
};

const getShadowClass = (shadow?: BlockShadow) => {
  switch(shadow) {
    case 'sm': return 'shadow-sm';
    case 'md': return 'shadow-md';
    case 'xl': return 'shadow-xl shadow-slate-200';
    default: return 'shadow-none';
  }
};

const getBgClass = (color?: BlockColor) => {
  switch(color) {
    case 'slate': return 'bg-slate-50 border-slate-200';
    case 'blue': return 'bg-blue-50 border-blue-200';
    case 'violet': return 'bg-violet-50 border-violet-200';
    case 'amber': return 'bg-amber-50 border-amber-200';
    case 'emerald': return 'bg-emerald-50 border-emerald-200';
    case 'rose': return 'bg-rose-50 border-rose-200';
    default: return 'bg-white border-transparent';
  }
};

const getFontClass = (font?: FontFamily) => {
  switch(font) {
    case 'serif': return 'font-serif';
    case 'mono': return 'font-mono';
    default: return 'font-sans';
  }
};

const getSizeClass = (size?: FontSize) => {
  switch(size) {
    case 'sm': return 'text-sm';
    case 'lg': return 'text-lg';
    case 'xl': return 'text-xl';
    case '2xl': return 'text-2xl';
    default: return 'text-base';
  }
};

const getAlignClass = (align?: TextAlign) => {
  switch(align) {
    case 'center': return 'text-center';
    case 'right': return 'text-right';
    default: return 'text-left';
  }
};

// --- COMPOSANT DE TEXTE RICHE (ContentEditable) ---
const EditableText = ({ 
  html, 
  tagName, 
  className, 
  onChange, 
  placeholder 
}: { 
  html: string, 
  tagName: string, 
  className: string, 
  onChange: (val: string) => void,
  placeholder?: string
}) => {
  const contentEditableRef = useRef<HTMLElement>(null);

  const handleInput = (e: React.FormEvent<HTMLElement>) => {
    onChange(e.currentTarget.innerHTML);
  };

  return React.createElement(tagName, {
    className: className,
    contentEditable: true,
    suppressContentEditableWarning: true,
    onInput: handleInput,
    onBlur: handleInput, // Sauvegarde finale
    dangerouslySetInnerHTML: { __html: html },
    placeholder: placeholder,
    ref: contentEditableRef
  });
};

// --- COMPOSANT PRINCIPAL ---
export default function App() {
  const [view, setView] = useState<'folders' | 'pages' | 'viewer' | 'editor'>('folders');
  const [currentFolder, setCurrentFolder] = useState<FolderData | null>(null);
  const [currentPage, setCurrentPage] = useState<PageData | null>(null);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [pages, setPages] = useState<PageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [password, setPassword] = useState("");
  const [editorBlocks, setEditorBlocks] = useState<Block[]>([]);
  const [editorTitle, setEditorTitle] = useState("");
  const [editorCover, setEditorCover] = useState("");

  useEffect(() => {
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

  useEffect(() => {
    if (!currentFolder) return;
    const q = query(collection(db, "pages"), where("folderId", "==", currentFolder.id));
    const unsub = onSnapshot(q, (snap) => {
      const fetchedPages = snap.docs.map(d => ({ id: d.id, ...d.data() } as PageData));
      fetchedPages.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setPages(fetchedPages);
    }, (error) => {
      console.error("Erreur lecture pages:", error);
    });
    return () => unsub();
  }, [currentFolder]);

  useEffect(() => {
    if ((window as any).MathJax) {
      setTimeout(() => {
        try {
          (window as any).MathJax.typesetPromise?.();
        } catch (e) { console.error("MathJax error", e); }
      }, 200);
    }
  }, [view, currentPage, editorBlocks]);

  const goHome = () => { setView('folders'); setCurrentFolder(null); };
  const openFolder = (folder: FolderData) => { setCurrentFolder(folder); setView('pages'); };
  const openPage = (page: PageData) => { setCurrentPage(page); setView('viewer'); };
  
  const startCreating = () => {
    setEditorBlocks([]);
    setEditorTitle("");
    setEditorCover("");
    setView('editor');
  };

  const handleCreateFolder = async () => {
    const name = prompt("Nom du dossier ?");
    if (name) {
      try { await addDoc(collection(db, 'folders'), { title: name, createdAt: serverTimestamp() }); } 
      catch (e: any) { alert("Erreur: " + e.message); }
    }
  };

  const handleDelete = async (id: string, col: string) => {
    if (confirm("Supprimer définitivement ?")) {
      try { await deleteDoc(doc(db, col, id)); } 
      catch (e: any) { alert("Erreur: " + e.message); }
    }
  };

  const handleSavePage = async () => {
    if (!editorTitle) return alert("Titre manquant !");
    if (!currentFolder) return alert("Erreur dossier.");
    try {
      await addDoc(collection(db, 'pages'), {
        folderId: currentFolder.id,
        title: editorTitle,
        coverUrl: editorCover,
        blocks: editorBlocks,
        createdAt: serverTimestamp()
      });
      setView('pages');
    } catch (e: any) { alert(`Erreur: ${e.message}`); }
  };

  const handleLogin = () => {
    if (password === "Formaeurs1") { setIsAdmin(true); setShowAuthModal(false); } 
    else { alert("Mot de passe incorrect"); }
  };

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
              <span className="font-semibold text-violet-600 bg-violet-50 px-2 py-1 rounded border border-violet-100">{currentFolder.title}</span>
            </>
          )}
        </div>
        <button onClick={() => isAdmin ? setIsAdmin(false) : setShowAuthModal(true)} className={`p-2 rounded-full border transition-all ${isAdmin ? 'bg-violet-100 text-violet-600 border-violet-200' : 'bg-white text-slate-400 border-slate-200 hover:border-violet-400'}`}>
          <Settings size={20} />
        </button>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 overflow-y-auto">
        
        {view === 'folders' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {loading && <p className="text-slate-400 col-span-full text-center animate-pulse">Chargement...</p>}
            {folders.map(folder => (
              <div key={folder.id} onClick={() => openFolder(folder)} className="group relative bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer flex flex-col gap-4">
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 group-hover:bg-amber-100 transition-colors"><Folder size={24} /></div>
                <div><h3 className="font-semibold text-lg text-slate-800 group-hover:text-violet-700 transition-colors">{folder.title}</h3><p className="text-xs text-slate-400 mt-1">Dossier</p></div>
                {isAdmin && <button onClick={(e) => { e.stopPropagation(); handleDelete(folder.id, 'folders'); }} className="absolute top-3 right-3 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>}
              </div>
            ))}
            {isAdmin && (
              <button onClick={handleCreateFolder} className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-violet-500 hover:text-violet-600 hover:bg-violet-50 transition-all group">
                <div className="p-2 rounded-full bg-slate-50 group-hover:bg-violet-100 transition-colors"><Plus size={24} /></div><span className="font-medium">Nouveau Dossier</span>
              </button>
            )}
          </div>
        )}

        {view === 'pages' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {pages.length === 0 && <p className="col-span-full text-center text-slate-400 py-10">Ce dossier est vide.</p>}
            {pages.map(page => (
              <div key={page.id} onClick={() => openPage(page)} className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer overflow-hidden flex flex-col h-64">
                <div className="h-32 bg-slate-100 relative overflow-hidden group-hover:opacity-90 transition-opacity">
                  {page.coverUrl ? <img src={page.coverUrl} alt="cover" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="w-full h-full bg-gradient-to-br from-violet-500 to-fuchsia-600 opacity-80" />}
                </div>
                <div className="p-5 flex-1 bg-white relative flex flex-col justify-between">
                  <h3 className="font-bold text-slate-800 line-clamp-2 group-hover:text-violet-700 transition-colors">{page.title}</h3>
                  <p className="text-xs text-slate-400 mt-2 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>{page.createdAt?.seconds ? new Date(page.createdAt.seconds * 1000).toLocaleDateString() : 'Récemment'}</p>
                </div>
                {isAdmin && <button onClick={(e) => { e.stopPropagation(); handleDelete(page.id, 'pages'); }} className="absolute top-2 right-2 p-1.5 bg-white/90 text-slate-400 rounded-lg hover:bg-red-500 hover:text-white shadow-sm transition-all"><Trash2 size={14} /></button>}
              </div>
            ))}
          </div>
        )}

        {/* VUE: LECTURE PAGE (VIEWER) */}
        {view === 'viewer' && currentPage && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[80vh] overflow-hidden">
             {currentPage.coverUrl ? (
               <div className="h-64 w-full overflow-hidden relative">
                 <img src={currentPage.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
               </div>
             ) : <div className="h-32 bg-slate-50 border-b border-slate-100"></div>}
             
             <div className="p-8 sm:p-12 max-w-5xl mx-auto -mt-10 relative z-10">
               <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 mb-12">
                 <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">{currentPage.title}</h1>
               </div>

               {/* GRILLE DE CONTENU (LAYOUT) */}
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
      </main>

      {isAdmin && view === 'pages' && (
        <button onClick={startCreating} className="fixed bottom-8 right-8 w-14 h-14 bg-violet-600 text-white rounded-full shadow-lg shadow-violet-600/30 flex items-center justify-center hover:scale-110 hover:bg-violet-700 transition-all duration-300 z-40 group">
          <Plus size={28} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
      )}

      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center border border-slate-100">
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Accès Formateur</h3>
            <input type="password" placeholder="Mot de passe" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all mb-4 text-center" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            <div className="flex gap-3"><button onClick={() => setShowAuthModal(false)} className="flex-1 py-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors font-medium">Annuler</button><button onClick={handleLogin} className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200">Entrer</button></div>
          </div>
        </div>
      )}

      {view === 'editor' && (
        <Editor title={editorTitle} setTitle={setEditorTitle} cover={editorCover} setCover={setEditorCover} blocks={editorBlocks} setBlocks={setEditorBlocks} onClose={() => setView('pages')} onSave={handleSavePage} storage={storage} />
      )}
    </div>
  );
}

// --- SOUS-COMPOSANTS ---

function BlockRenderer({ block }: { block: Block }) {
  const [flipped, setFlipped] = useState(false);
  const [open, setOpen] = useState(false);
  
  // Styles dynamiques
  const bgClass = getBgClass(block.style?.backgroundColor);
  const shadowClass = getShadowClass(block.style?.shadow);
  const fontClass = getFontClass(block.style?.fontFamily);
  const sizeClass = getSizeClass(block.style?.fontSize);
  const alignClass = getAlignClass(block.style?.textAlign);
  
  // Si une couleur est définie, on force une bordure visible sinon bordure par défaut
  const borderClass = block.style?.backgroundColor && block.style.backgroundColor !== 'white' ? 'border-transparent' : 'border-slate-100';
  
  const containerClasses = `h-full rounded-2xl p-6 border ${bgClass} ${borderClass} ${shadowClass} ${fontClass} ${sizeClass} ${alignClass} transition-all duration-300 overflow-hidden`;

  const renderContent = () => {
    switch (block.type) {
      case 'h2':
        return <h2 className={`text-2xl font-bold text-slate-800 pb-2 border-b border-slate-200/50 flex items-center gap-3 ${alignClass === 'text-center' ? 'justify-center' : alignClass === 'text-right' ? 'justify-end' : ''}`}><span className="w-2 h-8 bg-violet-500 rounded-full"></span>{block.content}</h2>;
      case 'text':
        return <div className="leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: block.content || '' }} />;
      case 'equation':
        return (
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50/50 rounded-lg">
             <div className="text-lg">
               {`$$ ${block.content || ''} $$`}
             </div>
          </div>
        );
      case 'callout':
        const colors = {
          info: 'bg-blue-50/50 border-blue-200 text-blue-900',
          warn: 'bg-amber-50/50 border-amber-200 text-amber-900',
          idea: 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
        };
        return (
          <div className={`p-4 rounded-xl border flex gap-4 text-left ${colors[block.subType || 'info']}`}>
            <AlertCircle className="shrink-0 mt-1 opacity-70" />
            <div className="font-medium" dangerouslySetInnerHTML={{ __html: block.content || '' }} />
          </div>
        );
      case 'flipcard':
        return (
          <div className="h-64 w-full perspective-1000 cursor-pointer group" onClick={() => setFlipped(!flipped)}>
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
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white/60 shadow-sm hover:shadow-md transition-shadow text-left">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors text-left font-semibold text-slate-800">
              {block.title}
              <ChevronDown className={`transform transition-transform duration-300 text-slate-400 ${open ? 'rotate-180' : ''}`} />
            </button>
            <div className={`grid accordion-content ${open ? 'accordion-open' : 'accordion-closed'}`}>
               <div className="accordion-inner p-4 border-t border-slate-100 text-slate-600 leading-relaxed bg-slate-50/50">
                 <div dangerouslySetInnerHTML={{ __html: block.content || '' }} />
               </div>
            </div>
          </div>
        );
      case 'timeline':
        return (
          <div className="space-y-6 relative py-2 text-left">
             <div className="absolute left-[7px] top-4 bottom-4 w-0.5 bg-slate-200"></div>
             {(block.items || []).map((item) => (
               <div key={item.id} className="relative pl-8 group">
                 <div className="absolute left-0 top-1.5 w-4 h-4 bg-white border-2 border-slate-300 rounded-full group-hover:border-violet-500 group-hover:scale-125 transition-all shadow-sm z-10" />
                 <div>
                   <span className="inline-block text-xs font-bold uppercase text-violet-600 bg-violet-50 px-2 py-0.5 rounded border border-violet-100 mb-1">{item.date}</span>
                   <h4 className="font-bold text-slate-800">{item.title}</h4>
                   <div className="text-slate-600 text-sm leading-relaxed mt-1">{item.description}</div>
                 </div>
               </div>
             ))}
          </div>
        );
      case 'image':
        return (
          <div className="rounded-xl overflow-hidden shadow-sm border border-slate-100">
            <img src={block.url} alt="content" className="w-full h-auto" loading="lazy" />
          </div>
        );
      case 'embed':
        return (
          <div className="rounded-xl overflow-hidden shadow-sm border border-slate-100 bg-slate-100 relative aspect-video">
             {block.url ? (
               <iframe 
                 src={block.url} 
                 className="absolute inset-0 w-full h-full" 
                 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                 allowFullScreen
                 title="Embed Content"
               />
             ) : (
               <div className="flex items-center justify-center h-full text-slate-400">Contenu Embed vide</div>
             )}
          </div>
        );
      case 'pdf':
        return (
          <div className="rounded-xl overflow-hidden shadow-sm border border-slate-100 h-[500px] bg-slate-50">
             {block.url ? (
               <object data={block.url} type="application/pdf" className="w-full h-full">
                 <div className="flex flex-col items-center justify-center h-full text-slate-500 p-4 text-center">
                   <p className="mb-2">Impossible d'afficher le PDF directement.</p>
                   <a href={block.url} target="_blank" rel="noopener noreferrer" className="text-violet-600 underline font-medium">Télécharger le fichier</a>
                 </div>
               </object>
             ) : (
               <div className="flex items-center justify-center h-full text-slate-400">Aucun PDF sélectionné</div>
             )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={containerClasses}>
      {renderContent()}
    </div>
  );
}

// --- CLAVIER VIRTUEL MATHS ---
function MathKeyboard({ onInsert }: { onInsert: (symbol: string) => void }) {
  const symbols = [
    '+', '-', '=', '\\times', '\\div', '\\pm', 
    '\\alpha', '\\beta', '\\pi', '\\theta', '\\infty', 
    '\\sqrt{}', 'x^2', '\\frac{a}{b}', '\\sum', '\\int', 
    '(', ')', '[', ']', '\\{', '\\}'
  ];

  return (
    <div className="grid grid-cols-6 gap-2 mt-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
      {symbols.map(sym => (
        <button 
          key={sym} 
          onClick={() => onInsert(sym === '\\sqrt{}' ? '\\sqrt{}' : sym + ' ')}
          className="p-2 bg-white border border-slate-100 rounded hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 text-sm font-mono transition-colors"
        >
          {sym.replace('\\', '')}
        </button>
      ))}
    </div>
  );
}

// --- ÉDITEUR PRINCIPAL ---

function Editor({ title, setTitle, cover, setCover, blocks, setBlocks, onClose, onSave, storage }: any) {
  const [uploading, setUploading] = useState(false);
  const [draggedBlockIndex, setDraggedBlockIndex] = useState<number | null>(null);

  // --- ACTIONS BLOCS ---
  const addBlock = (type: BlockType) => {
    const newBlock: Block = { 
      id: Date.now().toString(), 
      type, 
      width: '100%', 
      style: { 
        backgroundColor: 'white', 
        shadow: 'none', 
        fontFamily: 'sans', 
        fontSize: 'base',
        textAlign: 'left'
      }
    };
    if (type === 'callout') newBlock.subType = 'info';
    if (type === 'timeline') newBlock.items = [];
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id: string, updates: Partial<Block>) => {
    setBlocks(blocks.map((b: Block) => b.id === id ? { ...b, ...updates } : b));
  };
  
  const updateBlockStyle = (id: string, styleUpdates: Partial<BlockStyle>) => {
    setBlocks(blocks.map((b: Block) => b.id === id ? { ...b, style: { ...b.style, ...styleUpdates } } : b));
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter((b: Block) => b.id !== id));
  };

  // --- LOGIQUE DRAG & DROP ---
  const handleDragStart = (index: number) => {
    setDraggedBlockIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault(); // Nécessaire pour autoriser le drop
    const element = e.currentTarget as HTMLElement;
    element.classList.add('drag-over');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const element = e.currentTarget as HTMLElement;
    element.classList.remove('drag-over');
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const element = e.currentTarget as HTMLElement;
    element.classList.remove('drag-over');

    if (draggedBlockIndex === null || draggedBlockIndex === index) return;

    const newBlocks = [...blocks];
    const [movedBlock] = newBlocks.splice(draggedBlockIndex, 1);
    newBlocks.splice(index, 0, movedBlock);
    
    setBlocks(newBlocks);
    setDraggedBlockIndex(null);
  };

  // --- ACTIONS FORMATTAGE ---
  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  // --- ACTIONS SPECIFIQUES ---
  const addTimelineItem = (blockId: string) => {
    const newItem: TimelineItem = { id: Date.now().toString(), date: '2024', title: 'Nouvel événement', description: 'Description...' };
    setBlocks(blocks.map((b: Block) => b.id === blockId ? { ...b, items: [...(b.items || []), newItem] } : b));
  };
  const updateTimelineItem = (blockId: string, itemId: string, field: keyof TimelineItem, value: string) => {
    setBlocks(blocks.map((b: Block) => b.id === blockId ? { ...b, items: (b.items || []).map(i => i.id === itemId ? { ...i, [field]: value } : i) } : b));
  };
  const removeTimelineItem = (blockId: string, itemId: string) => {
    setBlocks(blocks.map((b: Block) => b.id === blockId ? { ...b, items: (b.items || []).filter(i => i.id !== itemId) } : b));
  };

  // --- UPLOAD ---
  const handleFileUpload = async (file: File) => {
    if (!file || !storage) return null;
    const storageRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    return new Promise<string>((resolve, reject) => {
      uploadTask.on('state_changed', () => {}, (err) => reject(err), async () => { resolve(await getDownloadURL(uploadTask.snapshot.ref)); });
    });
  };

  const onUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setUploading(true);
      try { const url = await handleFileUpload(e.target.files[0]); if (url) setCover(url); } 
      catch { alert("Erreur upload"); } finally { setUploading(false); }
    }
  };

  const onUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, blockId: string) => {
    if (e.target.files?.[0]) {
      setUploading(true);
      try { const url = await handleFileUpload(e.target.files[0]); if (url) updateBlock(blockId, { url }); } 
      catch { alert("Erreur upload"); } finally { setUploading(false); }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 z-50 flex overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col h-full overflow-y-auto shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
        <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
          <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Settings size={18} className="text-violet-500"/> Boîte à outils</h2>
        </div>
        <div className="p-4 space-y-6">
          <ToolSection title="Structure & Texte">
            <ToolButton icon={Type} label="Titre de Section" onClick={() => addBlock('h2')} />
            <ToolButton icon={FileText} label="Texte Simple" onClick={() => addBlock('text')} />
            <ToolButton icon={Sigma} label="Équation Math" onClick={() => addBlock('equation')} />
          </ToolSection>
          <ToolSection title="Interactif">
            <ToolButton icon={RotateCw} label="Flashcard" onClick={() => addBlock('flipcard')} />
            <ToolButton icon={List} label="Accordéon" onClick={() => addBlock('accordion')} />
            <ToolButton icon={Calendar} label="Timeline" onClick={() => addBlock('timeline')} />
          </ToolSection>
          <ToolSection title="Médias & Embed">
            <ToolButton icon={ImageIcon} label="Image" onClick={() => addBlock('image')} />
            <ToolButton icon={FileCode} label="Embed (Canva/YouTube)" onClick={() => addBlock('embed')} />
            <ToolButton icon={File} label="Document PDF" onClick={() => addBlock('pdf')} />
            <ToolButton icon={AlertCircle} label="Callout" onClick={() => addBlock('callout')} />
          </ToolSection>

          <div className="pt-6 mt-2 border-t border-slate-100">
             <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Couverture</label>
             <div className="flex gap-2">
                <input type="text" placeholder="URL image..." className="w-full text-sm p-2.5 border border-slate-200 rounded-lg" value={cover} onChange={(e) => setCover(e.target.value)} />
                <label className="p-2.5 bg-slate-100 rounded-lg cursor-pointer hover:bg-violet-100"><input type="file" hidden onChange={onUploadCover} accept="image/*" disabled={uploading} /><UploadCloud size={20} /></label>
             </div>
          </div>
        </div>
      </aside>

      {/* CANVAS */}
      <div className="flex-1 flex flex-col h-full relative bg-slate-50/50">
        <div className="absolute top-6 right-8 flex gap-3 z-20">
          <button onClick={onClose} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium shadow-sm">Annuler</button>
          <button onClick={onSave} className="px-6 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 font-medium shadow-lg shadow-violet-200 flex items-center gap-2"><Save size={18} /> Publier</button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 sm:p-12">
          <div className="max-w-5xl mx-auto min-h-[90%] bg-white rounded-2xl shadow-sm p-12 border border-slate-200 relative">
            <input type="text" placeholder="Titre de la page..." className="w-full text-4xl sm:text-5xl font-black text-slate-800 placeholder-slate-300 border-none focus:ring-0 outline-none bg-transparent mb-12" value={title} onChange={e => setTitle(e.target.value)} />

            <div className="flex flex-wrap -mx-3 items-start">
              {blocks.map((block: Block, index: number) => (
                <div 
                  key={block.id} 
                  className={`${getWidthClass(block.width)} px-3 mb-6 relative group transition-all duration-300 ${draggedBlockIndex === index ? 'dragging' : ''}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  
                  {/* BARRE D'OUTILS FLOTTANTE */}
                  <div className="absolute top-2 right-5 z-20 flex items-center gap-1 bg-white shadow-xl border border-slate-200 rounded-xl p-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap max-w-[320px] justify-end cursor-default" draggable={false} onDragStart={(e) => e.preventDefault()}>
                    
                    {/* Poignée Drag (Visuelle uniquement, le drag se fait sur le bloc) */}
                    <div className="p-1.5 text-slate-300 cursor-grab active:cursor-grabbing border-r border-slate-100 mr-1">
                      <GripVertical size={16} />
                    </div>

                    {/* Formatage Texte (Bold/Italic) */}
                    {(block.type === 'text' || block.type === 'callout') && (
                      <>
                        <div className="flex gap-0.5">
                          <button onClick={() => applyFormat('bold')} className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-violet-600" title="Gras (Ctrl+B)"><Bold size={14}/></button>
                          <button onClick={() => applyFormat('italic')} className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-violet-600" title="Italique (Ctrl+I)"><Italic size={14}/></button>
                        </div>
                        <div className="w-px h-4 bg-slate-200 mx-1"></div>
                      </>
                    )}

                    {/* Alignement */}
                    <div className="flex gap-0.5">
                      <button onClick={() => updateBlockStyle(block.id, { textAlign: 'left' })} className={`p-1.5 rounded hover:bg-slate-100 ${(!block.style?.textAlign || block.style.textAlign === 'left') ? 'text-violet-600 bg-violet-50' : 'text-slate-500'}`}><AlignLeft size={14}/></button>
                      <button onClick={() => updateBlockStyle(block.id, { textAlign: 'center' })} className={`p-1.5 rounded hover:bg-slate-100 ${block.style?.textAlign === 'center' ? 'text-violet-600 bg-violet-50' : 'text-slate-500'}`}><AlignCenter size={14}/></button>
                      <button onClick={() => updateBlockStyle(block.id, { textAlign: 'right' })} className={`p-1.5 rounded hover:bg-slate-100 ${block.style?.textAlign === 'right' ? 'text-violet-600 bg-violet-50' : 'text-slate-500'}`}><AlignRight size={14}/></button>
                    </div>

                    <div className="w-px h-4 bg-slate-200 mx-1"></div>

                    {/* Police & Taille */}
                    <select className="text-xs p-1 bg-slate-50 rounded border-none focus:ring-0 w-16" value={block.style?.fontFamily || 'sans'} onChange={(e) => updateBlockStyle(block.id, { fontFamily: e.target.value as FontFamily })}><option value="sans">Sans</option><option value="serif">Serif</option><option value="mono">Mono</option></select>
                    <select className="text-xs p-1 bg-slate-50 rounded border-none focus:ring-0 w-16" value={block.style?.fontSize || 'base'} onChange={(e) => updateBlockStyle(block.id, { fontSize: e.target.value as FontSize })}><option value="sm">Petit</option><option value="base">Moyen</option><option value="lg">Grand</option><option value="xl">XL</option><option value="2xl">XXL</option></select>

                    <div className="w-full h-px bg-slate-100 my-1"></div> {/* Séparateur ligne */}

                    {/* Layout */}
                    <button onClick={() => updateBlock(block.id, { width: '100%' })} className={`p-1.5 rounded hover:bg-slate-100 ${block.width === '100%' ? 'text-violet-600 bg-violet-50' : 'text-slate-400'}`} title="100%"><Maximize size={14}/></button>
                    <button onClick={() => updateBlock(block.id, { width: '50%' })} className={`p-1.5 rounded hover:bg-slate-100 ${block.width === '50%' ? 'text-violet-600 bg-violet-50' : 'text-slate-400'}`} title="50%"><Layout size={14}/></button>
                    <button onClick={() => updateBlock(block.id, { width: '33%' })} className={`p-1.5 rounded hover:bg-slate-100 ${block.width === '33%' ? 'text-violet-600 bg-violet-50' : 'text-slate-400'}`} title="33%"><Minimize size={14}/></button>
                    
                    <div className="w-px h-4 bg-slate-200 mx-1"></div>

                    {/* Couleur */}
                    <div className="flex gap-1 px-1 items-center">
                       {['white', 'slate', 'blue', 'violet', 'amber', 'emerald', 'rose'].map((c) => (
                         <button 
                           key={c} 
                           onClick={() => updateBlockStyle(block.id, { backgroundColor: c as BlockColor })} 
                           className={`w-4 h-4 rounded-full border border-slate-300 ${getBgClass(c as BlockColor)} hover:scale-125 transition-transform shadow-sm ${block.style?.backgroundColor === c ? 'ring-2 ring-violet-400 ring-offset-1' : ''}`}
                           title={c}
                         ></button>
                       ))}
                    </div>
                    
                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                    <button onClick={() => updateBlockStyle(block.id, { shadow: block.style?.shadow === 'md' ? 'none' : 'md' })} className={`p-1.5 rounded hover:bg-slate-100 ${block.style?.shadow === 'md' ? 'text-violet-600' : 'text-slate-400'}`} title="Ombre"><Box size={14}/></button>
                    
                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                    <button onClick={() => removeBlock(block.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded" title="Supprimer"><Trash2 size={14}/></button>
                  </div>

                  {/* Indicateur de poignée visuelle au survol (Feedback utilisateur) */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-8 p-2 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                    <GripVertical size={20} />
                  </div>

                  {/* CONTENU ÉDITABLE */}
                  <div className={`p-4 rounded-xl border-2 group-hover:border-violet-300 transition-all ${getBgClass(block.style?.backgroundColor)} ${getShadowClass(block.style?.shadow)} ${getFontClass(block.style?.fontFamily)} ${getSizeClass(block.style?.fontSize)} ${getAlignClass(block.style?.textAlign)}`}>
                    
                    {block.type === 'h2' && (
                      <input className={`w-full font-bold bg-transparent border-none focus:ring-0 placeholder-slate-300 ${getAlignClass(block.style?.textAlign)}`} placeholder="Titre..." value={block.content || ''} onChange={e => updateBlock(block.id, { content: e.target.value })} />
                    )}

                    {block.type === 'text' && (
                       <EditableText 
                          html={block.content || ''}
                          tagName="div"
                          className="min-h-[5rem] outline-none"
                          placeholder="Écrivez votre texte ici..."
                          onChange={(val) => updateBlock(block.id, { content: val })}
                       />
                    )}

                    {block.type === 'equation' && (
                      <div className="space-y-2">
                         <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-2 text-violet-600 font-medium text-sm"><Sigma size={16}/> Équation Mathématique</div>
                         </div>
                         <div className="bg-white border border-slate-200 rounded-lg p-2">
                           <input 
                             className="w-full text-sm font-mono bg-transparent border-none focus:ring-0" 
                             placeholder="Ex: \frac{a}{b}" 
                             value={block.content || ''} 
                             onChange={e => updateBlock(block.id, { content: e.target.value })}
                           />
                         </div>
                         <div className="text-xs text-slate-400 text-center py-2">Prévisualisation : <span className="text-slate-800 font-serif">$$ {block.content || '...'} $$</span></div>
                         
                         {/* Clavier Virtuel */}
                         <details className="mt-2">
                           <summary className="cursor-pointer text-xs font-bold text-violet-500 hover:text-violet-700 flex items-center gap-1"><Calculator size={12}/> Ouvrir Clavier Virtuel</summary>
                           <MathKeyboard onInsert={(sym) => updateBlock(block.id, { content: (block.content || '') + sym })} />
                         </details>
                      </div>
                    )}

                    {block.type === 'embed' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2 text-violet-600 font-medium text-sm"><FileCode size={16}/> Intégration (Canva, YouTube...)</div>
                        <input className="w-full text-sm p-2 bg-white border border-slate-200 rounded-lg" placeholder="Collez l'URL d'embed ici..." value={block.url || ''} onChange={e => updateBlock(block.id, { url: e.target.value })} />
                        {block.url && <div className="aspect-video bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 text-xs">Prévisualisation disponible en lecture</div>}
                      </div>
                    )}

                    {block.type === 'pdf' && (
                       <div className="space-y-3">
                         <div className="flex items-center gap-2 text-red-500 font-medium text-sm"><File size={16}/> Document PDF</div>
                         <div className="flex gap-2">
                           <input className="w-full text-sm p-2 bg-white border border-slate-200 rounded-lg" placeholder="URL du PDF..." value={block.url || ''} onChange={e => updateBlock(block.id, { url: e.target.value })} />
                           <label className="p-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"><input type="file" hidden onChange={(e) => onUploadFile(e, block.id)} accept="application/pdf" disabled={uploading} /><UploadCloud size={16} /></label>
                         </div>
                         {block.url && <div className="h-24 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs">PDF prêt</div>}
                       </div>
                    )}

                    {block.type === 'accordion' && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                        <input className="w-full p-3 font-bold border-b border-slate-100" placeholder="Titre Accordéon" value={block.title || ''} onChange={e => updateBlock(block.id, { title: e.target.value })} />
                        <EditableText 
                          html={block.content || ''}
                          tagName="div"
                          className="p-3 min-h-[4rem] outline-none text-slate-600"
                          placeholder="Contenu caché..."
                          onChange={(val) => updateBlock(block.id, { content: val })}
                       />
                      </div>
                    )}

                    {block.type === 'flipcard' && (
                       <div className="flex flex-col gap-2">
                         <input className="p-2 border rounded-lg bg-white" placeholder="Question (Recto)" value={block.front || ''} onChange={e => updateBlock(block.id, { front: e.target.value })} />
                         <input className="p-2 border rounded-lg bg-violet-50" placeholder="Réponse (Verso)" value={block.back || ''} onChange={e => updateBlock(block.id, { back: e.target.value })} />
                       </div>
                    )}

                    {block.type === 'timeline' && (
                       <div className="space-y-3">
                         {(block.items || []).map(item => (
                           <div key={item.id} className="flex gap-2 items-start bg-white p-3 rounded-lg border border-slate-200">
                             <div className="grid gap-2 flex-1">
                               <input className="text-xs font-bold uppercase text-violet-600" placeholder="DATE" value={item.date} onChange={e => updateTimelineItem(block.id, item.id, 'date', e.target.value)} />
                               <input className="font-bold" placeholder="Titre" value={item.title} onChange={e => updateTimelineItem(block.id, item.id, 'title', e.target.value)} />
                               <textarea className="text-sm text-slate-600 resize-none" rows={1} placeholder="Desc..." value={item.description} onChange={e => updateTimelineItem(block.id, item.id, 'description', e.target.value)} />
                             </div>
                             <button onClick={() => removeTimelineItem(block.id, item.id)} className="text-slate-300 hover:text-red-500"><X size={14}/></button>
                           </div>
                         ))}
                         <button onClick={() => addTimelineItem(block.id)} className="text-xs font-bold text-violet-600 hover:underline">+ Ajouter Étape</button>
                       </div>
                    )}
                    
                    {block.type === 'callout' && (
                       <div className="flex gap-3 bg-white p-3 rounded-lg border border-slate-200">
                          <AlertCircle className="text-slate-400 shrink-0"/>
                          <div className="flex-1 grid gap-2">
                             <select className="text-xs font-bold uppercase text-slate-400" value={block.subType} onChange={e => updateBlock(block.id, { subType: e.target.value as any })}><option value="info">Info</option><option value="warn">Attention</option><option value="idea">Idée</option></select>
                             <EditableText 
                                html={block.content || ''}
                                tagName="div"
                                className="outline-none"
                                placeholder="Votre note..."
                                onChange={(val) => updateBlock(block.id, { content: val })}
                             />
                          </div>
                       </div>
                    )}

                    {block.type === 'image' && (
                       <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 bg-slate-50">
                          {block.url ? <div className="relative w-full"><img src={block.url} className="rounded-lg w-full"/><button onClick={() => updateBlock(block.id, { url: '' })} className="absolute top-2 right-2 bg-white text-red-500 p-1 rounded shadow"><Trash2 size={14}/></button></div> : 
                          <label className="cursor-pointer flex flex-col items-center text-slate-400 hover:text-violet-600"><UploadCloud size={24}/><span className="text-xs mt-1">Uploader Image</span><input type="file" hidden onChange={(e) => onUploadFile(e, block.id)} accept="image/*" /></label>}
                       </div>
                    )}
                  </div>
                </div>
              ))}
              {blocks.length === 0 && <div className="w-full text-center py-20 border-2 border-dashed border-slate-200 rounded-xl text-slate-300">Ajoutez des blocs pour commencer</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolSection({ title, children }: any) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ToolButton({ icon: Icon, label, onClick }: any) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-transparent hover:bg-violet-50 hover:text-violet-700 transition-all text-slate-600 group text-left">
      <Icon size={16} className="text-slate-400 group-hover:text-violet-600" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}