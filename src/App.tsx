import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import {
  Folder,
  FileText,
  Plus,
  Trash2,
  ChevronRight,
  Home,
  Settings,
  Save,
  X,
  Image as ImageIcon,
  Type,
  List,
  AlertCircle,
  ChevronDown,
  RotateCw,
  UploadCloud,
  Loader2,
} from 'lucide-react';

// --- CONFIGURATION FIREBASE ---
const firebaseConfig = {
  apiKey: 'AIzaSyCifL5Vt1kyGx7eeNHfJsELaZTChxkPIQQ',
  authDomain: 'cartesmentalesrt.firebaseapp.com',
  projectId: 'cartesmentalesrt',
  storageBucket: 'cartesmentalesrt.firebasestorage.app',
  messagingSenderId: '254616841619',
  appId: '1:254616841619:web:ef0e2eb162c4c80d0c8c66',
  measurementId: 'G-5Z7BVY12B9',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// --- TYPES ---
type BlockType =
  | 'h2'
  | 'text'
  | 'image'
  | 'callout'
  | 'flipcard'
  | 'accordion'
  | 'timeline';

interface Block {
  id: string;
  type: BlockType;
  content?: string;
  url?: string;
  subType?: 'info' | 'warn' | 'idea';
  front?: string;
  back?: string;
  title?: string;
  date?: string;
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
  const [view, setView] = useState<'folders' | 'pages' | 'viewer' | 'editor'>(
    'folders'
  );
  const [currentFolder, setCurrentFolder] = useState<FolderData | null>(null);
  const [currentPage, setCurrentPage] = useState<PageData | null>(null);

  // Data State
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [pages, setPages] = useState<PageData[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [password, setPassword] = useState('');

  // Editor State
  const [editorBlocks, setEditorBlocks] = useState<Block[]>([]);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorCover, setEditorCover] = useState('');

  // --- EFFETS (LISTENERS FIREBASE) ---

  // Charger les dossiers
  useEffect(() => {
    const q = query(collection(db, 'folders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setFolders(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as FolderData))
      );
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Charger les pages quand on est dans un dossier
  useEffect(() => {
    if (!currentFolder) return;
    const q = query(
      collection(db, 'pages'),
      where('folderId', '==', currentFolder.id),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setPages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PageData)));
    });
    return () => unsub();
  }, [currentFolder]);

  // MathJax Refresh
  useEffect(() => {
    if ((window as any).MathJax) {
      setTimeout(() => (window as any).MathJax.typesetPromise(), 100);
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
    setEditorTitle('');
    setEditorCover('');
    setView('editor');
  };

  // --- ACTIONS FIREBASE ---

  const handleCreateFolder = async () => {
    const name = prompt('Nom du dossier ?');
    if (name) {
      await addDoc(collection(db, 'folders'), {
        title: name,
        createdAt: serverTimestamp(),
      });
    }
  };

  const handleDelete = async (id: string, col: string) => {
    if (confirm('Supprimer définitivement ?')) {
      await deleteDoc(doc(db, col, id));
    }
  };

  const handleSavePage = async () => {
    if (!editorTitle) return alert('Ajoutez un titre !');
    if (!currentFolder) return;

    try {
      await addDoc(collection(db, 'pages'), {
        folderId: currentFolder.id,
        title: editorTitle,
        coverUrl: editorCover,
        blocks: editorBlocks,
        createdAt: serverTimestamp(),
      });
      setView('pages');
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleLogin = () => {
    if (password === 'Formaeurs1') {
      setIsAdmin(true);
      setShowAuthModal(false);
    } else {
      alert('Mot de passe incorrect');
    }
  };

  // --- RENDERERS (VUES) ---

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 h-16 px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-violet-600 text-white p-2 rounded-lg">
            <RotateCw size={20} />
          </div>
          <span className="font-bold text-xl text-violet-900 tracking-tight">
            LearnFlow
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button
            onClick={goHome}
            className="hover:text-violet-600 flex items-center gap-1 transition-colors"
          >
            <Home size={14} /> Bibliothèque
          </button>
          {currentFolder && (
            <>
              <ChevronRight size={14} />
              <span className="font-semibold text-violet-600 bg-violet-50 px-2 py-1 rounded">
                {currentFolder.title}
              </span>
            </>
          )}
        </div>

        <button
          onClick={() => (isAdmin ? setIsAdmin(false) : setShowAuthModal(true))}
          className={`p-2 rounded-full border transition-all ${
            isAdmin
              ? 'bg-violet-100 text-violet-600 border-violet-200'
              : 'bg-white text-slate-400 border-slate-200 hover:border-violet-400'
          }`}
        >
          <Settings size={20} />
        </button>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-8 overflow-y-auto">
        {/* VUE: LISTE DES DOSSIERS */}
        {view === 'folders' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {loading && (
              <p className="text-slate-400 col-span-full text-center">
                Chargement...
              </p>
            )}

            {folders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => openFolder(folder)}
                className="group relative bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer flex flex-col gap-4"
              >
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 text-2xl group-hover:bg-amber-100 transition-colors">
                  <Folder />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-800">
                    {folder.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Dossier</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(folder.id, 'folders');
                    }}
                    className="absolute top-3 right-3 p-2 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}

            {isAdmin && (
              <button
                onClick={handleCreateFolder}
                className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-violet-500 hover:text-violet-600 hover:bg-violet-50 transition-all"
              >
                <Plus size={32} />
                <span className="font-medium">Nouveau Dossier</span>
              </button>
            )}
          </div>
        )}

        {/* VUE: LISTE DES PAGES */}
        {view === 'pages' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {pages.length === 0 && (
              <p className="col-span-full text-center text-slate-400 py-10">
                Ce dossier est vide.
              </p>
            )}

            {pages.map((page) => (
              <div
                key={page.id}
                onClick={() => openPage(page)}
                className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer overflow-hidden flex flex-col h-60"
              >
                <div className="h-32 bg-slate-100 relative overflow-hidden">
                  {page.coverUrl ? (
                    <img
                      src={page.coverUrl}
                      alt="cover"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-500 to-purple-600 opacity-80" />
                  )}
                </div>
                <div className="p-5 flex-1 bg-white relative">
                  <h3 className="font-bold text-slate-800 line-clamp-2">
                    {page.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2">
                    {page.createdAt
                      ? new Date(
                          page.createdAt.seconds * 1000
                        ).toLocaleDateString()
                      : 'Récemment'}
                  </p>
                </div>
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(page.id, 'pages');
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 text-red-500 rounded-lg hover:bg-red-500 hover:text-white shadow-sm transition-all"
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
            {currentPage.coverUrl && (
              <div className="h-64 w-full overflow-hidden">
                <img
                  src={currentPage.coverUrl}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-10 max-w-3xl mx-auto">
              <h1 className="text-4xl font-extrabold text-slate-900 mb-8">
                {currentPage.title}
              </h1>
              <div className="space-y-8">
                {currentPage.blocks.map((block) => (
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
          className="fixed bottom-8 right-8 w-16 h-16 bg-violet-600 text-white rounded-full shadow-lg shadow-violet-600/30 flex items-center justify-center hover:scale-110 hover:rotate-90 transition-all duration-300 z-40"
        >
          <Plus size={32} />
        </button>
      )}

      {/* MODAL AUTH */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
            <h3 className="text-2xl font-bold text-slate-800 mb-2">
              Accès Formateur
            </h3>
            <p className="text-slate-500 mb-6 text-sm">
              Veuillez vous identifier pour modifier le contenu.
            </p>
            <input
              type="password"
              placeholder="Mot de passe"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all mb-4 text-center"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowAuthModal(false)}
                className="flex-1 py-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleLogin}
                className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200"
              >
                Entrer
              </button>
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
      return (
        <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4 border-l-4 border-violet-500 pl-4">
          {block.content}
        </h2>
      );
    case 'text':
      return (
        <div
          className="text-lg text-slate-600 leading-relaxed whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: block.content || '' }}
        />
      );
    case 'callout':
      const colors = {
        info: 'bg-blue-50 border-blue-200 text-blue-800',
        warn: 'bg-amber-50 border-amber-200 text-amber-800',
        idea: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      };
      return (
        <div
          className={`p-6 rounded-xl border-l-4 flex gap-4 ${
            colors[block.subType || 'info']
          }`}
        >
          <AlertCircle className="shrink-0 mt-1" />
          <div dangerouslySetInnerHTML={{ __html: block.content || '' }} />
        </div>
      );
    case 'flipcard':
      return (
        <div
          className="h-64 w-full max-w-md mx-auto perspective-1000 cursor-pointer group"
          onClick={() => setFlipped(!flipped)}
        >
          <div
            className={`relative w-full h-full duration-500 transform-style-3d transition-transform ${
              flipped ? 'rotate-y-180' : ''
            }`}
          >
            <div className="absolute inset-0 backface-hidden bg-white border-2 border-violet-100 rounded-2xl flex items-center justify-center p-8 text-center shadow-sm group-hover:shadow-md transition-shadow">
              <span className="text-xl font-semibold text-violet-800">
                {block.front}
              </span>
            </div>
            <div className="absolute inset-0 backface-hidden bg-violet-600 rounded-2xl rotate-y-180 flex items-center justify-center p-8 text-center shadow-lg text-white">
              <span className="text-xl font-medium">{block.back}</span>
            </div>
          </div>
        </div>
      );
    case 'accordion':
      return (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors text-left font-semibold text-slate-800"
          >
            {block.title}
            <ChevronDown
              className={`transform transition-transform ${
                open ? 'rotate-180' : ''
              }`}
            />
          </button>
          <div
            className={`bg-slate-50 overflow-hidden transition-all duration-300 ${
              open ? 'max-h-96 p-4 border-t border-slate-200' : 'max-h-0'
            }`}
          >
            <div
              dangerouslySetInnerHTML={{ __html: block.content || '' }}
              className="text-slate-600"
            />
          </div>
        </div>
      );
    case 'timeline':
      return (
        <div className="flex gap-4 pl-4 border-l-2 border-slate-200 relative py-2">
          <div className="absolute -left-[9px] top-4 w-4 h-4 bg-violet-500 rounded-full border-4 border-white shadow-sm" />
          <div className="flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-violet-500">
              {block.date}
            </span>
            <div
              dangerouslySetInnerHTML={{ __html: block.content || '' }}
              className="text-slate-700 mt-1"
            />
          </div>
        </div>
      );
    case 'image':
      return (
        <img
          src={block.url}
          alt="content"
          className="rounded-xl shadow-md w-full"
        />
      );
    default:
      return null;
  }
}

// --- ÉDITEUR ---

function Editor({
  title,
  setTitle,
  cover,
  setCover,
  blocks,
  setBlocks,
  onClose,
  onSave,
  storage,
}: any) {
  const [uploading, setUploading] = useState(false);

  const addBlock = (type: BlockType) => {
    const newBlock: Block = { id: Date.now().toString(), type };
    if (type === 'callout') newBlock.subType = 'info';
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id: string, field: keyof Block, value: string) => {
    setBlocks(
      blocks.map((b: Block) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter((b: Block) => b.id !== id));
  };

  // --- LOGIQUE UPLOAD ---
  const handleFileUpload = async (file: File) => {
    if (!file) return null;
    const storageRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise<string>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          /* Progress (optionnel) */
        },
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
        alert('Erreur upload');
      } finally {
        setUploading(false);
      }
    }
  };

  const onUploadBlockImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
    blockId: string
  ) => {
    if (e.target.files && e.target.files[0]) {
      setUploading(true);
      try {
        const url = await handleFileUpload(e.target.files[0]);
        if (url) updateBlock(blockId, 'url', url);
      } catch (err) {
        alert('Erreur upload');
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-100 z-50 flex">
      {/* Sidebar Tools */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col h-full overflow-y-auto">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-lg">Boîte à outils</h2>
          <p className="text-xs text-slate-400">
            Glissez ou cliquez pour ajouter
          </p>
        </div>

        <div className="p-4 space-y-6">
          <ToolSection title="Structure">
            <ToolButton
              icon={Type}
              label="Titre Section"
              onClick={() => addBlock('h2')}
            />
            <ToolButton
              icon={FileText}
              label="Texte Riche"
              onClick={() => addBlock('text')}
            />
          </ToolSection>

          <ToolSection title="Interactif">
            <ToolButton
              icon={RotateCw}
              label="Flashcard"
              onClick={() => addBlock('flipcard')}
            />
            <ToolButton
              icon={List}
              label="Accordéon"
              onClick={() => addBlock('accordion')}
            />
            <ToolButton
              icon={List}
              label="Timeline"
              onClick={() => addBlock('timeline')}
            />
          </ToolSection>

          <ToolSection title="Visuel">
            <ToolButton
              icon={AlertCircle}
              label="Callout"
              onClick={() => addBlock('callout')}
            />
            <ToolButton
              icon={ImageIcon}
              label="Image"
              onClick={() => addBlock('image')}
            />
          </ToolSection>

          <div className="pt-4 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
              Image de couverture
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="URL..."
                className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-200 outline-none"
                value={cover}
                onChange={(e) => setCover(e.target.value)}
              />
              <label className="p-2 bg-slate-100 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors">
                <input
                  type="file"
                  hidden
                  onChange={onUploadCover}
                  accept="image/*"
                />
                {uploading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <UploadCloud size={20} />
                )}
              </label>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col h-full relative">
        <div className="absolute top-4 right-6 flex gap-3 z-10">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium shadow-sm"
          >
            Annuler
          </button>
          <button
            onClick={onSave}
            className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-medium shadow-md shadow-violet-200 flex items-center gap-2"
          >
            <Save size={18} /> Publier
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-12">
          <div className="max-w-3xl mx-auto min-h-full bg-white rounded-xl shadow-sm p-12 border border-slate-100">
            {/* Title Input */}
            <input
              type="text"
              placeholder="Titre de votre page..."
              className="w-full text-5xl font-black text-slate-800 placeholder-slate-300 border-none focus:ring-0 outline-none mb-12"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            {/* Blocks */}
            <div className="space-y-6">
              {blocks.map((block: Block) => (
                <div
                  key={block.id}
                  className="group relative border-2 border-transparent hover:border-slate-100 rounded-xl p-4 -mx-4 transition-all"
                >
                  {/* Controls */}
                  <div className="absolute -right-10 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                    <button
                      onClick={() => removeBlock(block.id)}
                      className="p-2 bg-white border border-slate-200 text-red-400 rounded-full hover:text-red-600 hover:border-red-200 shadow-sm"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Editable Content */}
                  {block.type === 'h2' && (
                    <input
                      className="w-full text-2xl font-bold text-slate-800 border-none focus:ring-0 outline-none border-l-4 border-violet-200 pl-4 placeholder-slate-300"
                      placeholder="Titre de section..."
                      value={block.content || ''}
                      onChange={(e) =>
                        updateBlock(block.id, 'content', e.target.value)
                      }
                    />
                  )}

                  {block.type === 'text' && (
                    <textarea
                      className="w-full text-lg text-slate-600 resize-none border-none focus:ring-0 outline-none bg-transparent placeholder-slate-300 h-auto"
                      placeholder="Commencez à écrire..."
                      rows={3}
                      value={block.content || ''}
                      onChange={(e) =>
                        updateBlock(block.id, 'content', e.target.value)
                      }
                    />
                  )}

                  {block.type === 'callout' && (
                    <div className="flex gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <AlertCircle className="text-blue-500 shrink-0" />
                      <div className="flex-1">
                        <select
                          className="text-xs bg-transparent border-none text-blue-400 font-bold uppercase mb-1 focus:ring-0 p-0"
                          value={block.subType}
                          onChange={(e) =>
                            updateBlock(block.id, 'subType', e.target.value)
                          }
                        >
                          <option value="info">Info</option>
                          <option value="warn">Attention</option>
                          <option value="idea">Idée</option>
                        </select>
                        <input
                          className="w-full bg-transparent border-none focus:ring-0 outline-none text-blue-900"
                          placeholder="Message important..."
                          value={block.content || ''}
                          onChange={(e) =>
                            updateBlock(block.id, 'content', e.target.value)
                          }
                        />
                      </div>
                    </div>
                  )}

                  {block.type === 'flipcard' && (
                    <div className="flex gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex-1 space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">
                          Recto
                        </label>
                        <input
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                          placeholder="Question..."
                          value={block.front || ''}
                          onChange={(e) =>
                            updateBlock(block.id, 'front', e.target.value)
                          }
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">
                          Verso
                        </label>
                        <input
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                          placeholder="Réponse..."
                          value={block.back || ''}
                          onChange={(e) =>
                            updateBlock(block.id, 'back', e.target.value)
                          }
                        />
                      </div>
                    </div>
                  )}

                  {block.type === 'accordion' && (
                    <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                      <input
                        className="w-full font-bold text-slate-800 bg-transparent border-b border-slate-100 pb-2 focus:ring-0 outline-none"
                        placeholder="Titre visible..."
                        value={block.title || ''}
                        onChange={(e) =>
                          updateBlock(block.id, 'title', e.target.value)
                        }
                      />
                      <textarea
                        className="w-full text-slate-600 bg-transparent border-none focus:ring-0 outline-none resize-none"
                        placeholder="Contenu caché..."
                        rows={2}
                        value={block.content || ''}
                        onChange={(e) =>
                          updateBlock(block.id, 'content', e.target.value)
                        }
                      />
                    </div>
                  )}

                  {block.type === 'timeline' && (
                    <div className="flex gap-4 items-start pl-4 border-l-2 border-slate-200">
                      <div className="w-3 h-3 bg-slate-400 rounded-full -ml-[23px] mt-2 border-2 border-white box-content" />
                      <div className="flex-1 space-y-1">
                        <input
                          className="w-full text-xs font-bold uppercase text-violet-500 bg-transparent border-none focus:ring-0 outline-none p-0"
                          placeholder="DATE / ÉTAPE"
                          value={block.date || ''}
                          onChange={(e) =>
                            updateBlock(block.id, 'date', e.target.value)
                          }
                        />
                        <input
                          className="w-full text-slate-700 bg-transparent border-none focus:ring-0 outline-none p-0"
                          placeholder="Description de l'événement..."
                          value={block.content || ''}
                          onChange={(e) =>
                            updateBlock(block.id, 'content', e.target.value)
                          }
                        />
                      </div>
                    </div>
                  )}

                  {block.type === 'image' && (
                    <div className="space-y-2">
                      {block.url ? (
                        <div className="relative group/img">
                          <img
                            src={block.url}
                            className="w-full rounded-lg shadow-sm"
                            alt="uploaded"
                          />
                          <button
                            onClick={() => updateBlock(block.id, 'url', '')}
                            className="absolute top-2 right-2 bg-white/90 p-1 rounded-full text-red-500 opacity-0 group-hover/img:opacity-100 transition-opacity"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center gap-4 hover:border-violet-300 transition-colors bg-slate-50">
                          {uploading ? (
                            <Loader2
                              className="animate-spin text-violet-500"
                              size={32}
                            />
                          ) : (
                            <UploadCloud className="text-slate-400" size={32} />
                          )}
                          <div className="text-center">
                            <label className="text-violet-600 font-semibold cursor-pointer hover:underline">
                              Cliquez pour uploader
                              <input
                                type="file"
                                hidden
                                onChange={(e) =>
                                  onUploadBlockImage(e, block.id)
                                }
                                accept="image/*"
                              />
                            </label>
                            <span className="text-slate-400 text-sm">
                              {' '}
                              ou copiez une URL ci-dessous
                            </span>
                          </div>
                          <input
                            className="w-full bg-white p-2 rounded-lg text-sm border border-slate-200"
                            placeholder="https://..."
                            onChange={(e) =>
                              updateBlock(block.id, 'url', e.target.value)
                            }
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {blocks.length === 0 && (
                <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-xl text-slate-300">
                  Votre page est vide. Ajoutez des blocs depuis la gauche.
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
    <div className="mb-6">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ToolButton({ icon: Icon, label, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-white hover:border-violet-500 hover:text-violet-600 hover:shadow-md transition-all text-slate-600 group text-left"
    >
      <Icon size={18} className="group-hover:scale-110 transition-transform" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
