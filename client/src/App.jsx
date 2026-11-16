import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import Icon from './Icon.jsx';
import Modal from './Modal.jsx';

const EMPTY_FILTERS = { subject: '', program: '', university: '', faculty: '' };
const SESSION_KEY = 'campus-papers-session';
const MAX_FILE_BYTES = 15 * 1024 * 1024;

function readSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY));
    return saved?.token && saved?.user ? saved : null;
  } catch {
    return null;
  }
}

function formatDate(value) {
  return new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' }).format(new Date(value));
}

function formatSize(bytes) {
  return bytes ? `${(bytes / (1024 * 1024)).toFixed(1)} Mo` : 'PDF';
}

function ExamCard({ exam, index, onOpen }) {
  const covers = ['mint', 'sand', 'lavender', 'blue'];
  return (
    <button className="exam-card" onClick={() => onOpen(exam.id)} type="button">
      <div className={`exam-cover cover-${covers[index % covers.length]}`}>
        <div className="cover-topline"><span className="cover-mark">CP</span><span>{exam.examYear || 'ANNALE'}</span></div>
        <div className="cover-paper">
          <i /><i /><i /><span>PDF</span>
        </div>
        <span className="cover-open"><Icon name="arrow" size={16} /></span>
      </div>
      <div className="exam-card__body">
        <div className="card-tags">
          <span className="tag">{exam.program}</span>
          {exam.examYear && <span className="tag tag--muted">{exam.examYear}</span>}
        </div>
        <h3>{exam.subject}</h3>
        <p><Icon name="school" size={15} />{exam.university}</p>
        <div className="exam-card__footer"><span>{exam.faculty}</span><span>{formatSize(exam.fileSizeBytes)}</span></div>
      </div>
    </button>
  );
}

function AuthDialog({ mode, setMode, onAuthenticated, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isRegister = mode === 'register';

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const fields = new FormData(event.currentTarget);
    const body = { email: fields.get('email'), password: fields.get('password') };
    if (isRegister) body.displayName = fields.get('displayName');
    try {
      const result = await api[isRegister ? 'register' : 'login'](body);
      onAuthenticated(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      eyebrow="Bienvenue sur Campus Papers"
      onClose={onClose}
      title={isRegister ? 'Créer mon compte' : 'Content de vous revoir'}
    >
      <p className="modal-intro">{isRegister
        ? 'Rejoignez la bibliothèque partagée par les étudiants.'
        : 'Connectez-vous pour publier vos épreuves.'}</p>
      <form className="form-stack" onSubmit={submit}>
        {isRegister && <label className="field"><span>Nom affiché</span>
          <input autoComplete="name" maxLength="80" minLength="2" name="displayName" placeholder="Ex. Awa Diop" required />
        </label>}
        <label className="field"><span>Adresse e-mail</span>
          <input autoComplete="email" name="email" placeholder="vous@exemple.com" required type="email" />
        </label>
        <label className="field"><span>Mot de passe</span>
          <input autoComplete={isRegister ? 'new-password' : 'current-password'} maxLength="72"
            minLength={isRegister ? 12 : 1} name="password"
            placeholder={isRegister ? '12 caractères minimum' : 'Votre mot de passe'} required type="password" />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button--primary button--full" disabled={busy} type="submit">
          {busy ? 'Un instant…' : isRegister ? 'Créer mon compte' : 'Se connecter'}
          {!busy && <Icon name="arrow" size={16} />}
        </button>
      </form>
      <p className="auth-switch">
        {isRegister ? 'Vous avez déjà un compte ?' : 'Pas encore de compte ?'}
        <button onClick={() => { setError(''); setMode(isRegister ? 'login' : 'register'); }} type="button">
          {isRegister ? 'Se connecter' : 'Créer un compte'}
        </button>
      </p>
      <p className="privacy-note">Votre adresse e-mail ne sera jamais affichée publiquement.</p>
    </Modal>
  );
}

function UploadDialog({ token, onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    const formData = new FormData(event.currentTarget);
    if (!file) return setError('Choisissez le fichier PDF de votre épreuve.');
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
      return setError('Seuls les fichiers PDF sont acceptés.');
    }
    if (file.size > MAX_FILE_BYTES) return setError('Le fichier dépasse la limite de 15 Mo.');
    formData.set('file', file);
    setBusy(true);
    try {
      const result = await api.upload(token, formData);
      onUploaded(result.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal eyebrow="Contribuer à la bibliothèque" onClose={onClose} title="Déposer une épreuve" wide>
      <p className="modal-intro">Quelques informations pour aider les étudiants à retrouver le bon document.</p>
      <form className="form-stack" onSubmit={submit}>
        <div className="upload-grid">
          <label className="field"><span>Matière</span><input maxLength="120" name="subject" placeholder="Ex. Microéconomie" required /></label>
          <label className="field"><span>Filière</span><input maxLength="120" name="program" placeholder="Ex. Licence économie" required /></label>
          <label className="field"><span>Université</span><input maxLength="160" name="university" placeholder="Nom de l’université" required /></label>
          <label className="field"><span>École ou faculté</span><input maxLength="160" name="faculty" placeholder="Ex. Faculté des sciences" required /></label>
          <label className="field upload-year"><span>Année <small>(facultatif)</small></span>
            <input max="2100" min="1900" name="examYear" placeholder="2025" type="number" />
          </label>
        </div>
        <label className={`file-drop${file ? ' file-drop--selected' : ''}`}>
          <input accept=".pdf,application/pdf" aria-label="Choisir le fichier PDF"
            onChange={(event) => setFile(event.target.files?.[0] || null)} type="file" />
          <span className="file-drop__icon"><Icon name={file ? 'check' : 'upload'} size={21} /></span>
          <span className="file-drop__text">
            <strong>{file ? file.name : 'Cliquez pour choisir votre PDF'}</strong>
            <small>{file ? formatSize(file.size) : 'PDF uniquement · 15 Mo maximum'}</small>
          </span>
          <span className="file-drop__action">{file ? 'Modifier' : 'Parcourir'}</span>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="upload-notice"><Icon name="spark" size={17} />
          <span>Partagez uniquement des documents que vous avez le droit de diffuser.</span>
        </div>
        <div className="form-actions">
          <button className="button button--quiet" onClick={onClose} type="button">Annuler</button>
          <button className="button button--primary" disabled={busy} type="submit">
            {busy ? 'Envoi en cours…' : 'Publier l’épreuve'} {!busy && <Icon name="arrow" size={16} />}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ExamDialog({ exam, loading, isMine, deleting, onClose, onDelete, notify }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = new URL(window.location.href);
    url.searchParams.set('exam', exam.id);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      notify('Lien de partage copié.');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      notify('Impossible de copier le lien automatiquement.');
    }
  }

  return (
    <Modal eyebrow="Détail de l’épreuve" onClose={onClose} title={loading ? 'Chargement…' : exam?.subject || 'Épreuve'} wide>
      {loading || !exam ? <div className="detail-loading"><span className="spinner" /></div> : <>
        <div className="detail-banner">
          <div className="detail-pdf"><Icon name="file" size={29} /><span>PDF</span></div>
          <div><span className="eyebrow">{exam.program}</span><h3>{exam.originalFilename}</h3>
            <p>Ajoutée le {formatDate(exam.createdAt)} · {formatSize(exam.fileSizeBytes)}</p></div>
        </div>
        <div className="detail-facts">
          <div><span>Matière</span><strong>{exam.subject}</strong></div>
          <div><span>Université</span><strong>{exam.university}</strong></div>
          <div><span>École / faculté</span><strong>{exam.faculty}</strong></div>
          <div><span>Année</span><strong>{exam.examYear || 'Non précisée'}</strong></div>
          <div><span>Partagée par</span><strong>{exam.uploader?.displayName || 'Étudiant'}</strong></div>
        </div>
        <div className="detail-actions">
          <a className="button button--primary" href={api.downloadUrl(exam.id)} rel="noreferrer" target="_blank">
            <Icon name="download" size={17} /> Télécharger le PDF
          </a>
          <button className="button button--quiet" onClick={share} type="button">
            <Icon name={copied ? 'check' : 'copy'} size={16} /> {copied ? 'Lien copié' : 'Partager'}
          </button>
          {isMine && <button className="button button--danger-quiet" disabled={deleting}
            onClick={() => onDelete(exam.id)} type="button">
            <Icon name="trash" size={16} /> {deleting ? 'Suppression…' : 'Supprimer'}
          </button>}
        </div>
      </>}
    </Modal>
  );
}

export default function App() {
  const [session, setSession] = useState(readSession);
  const [mode, setMode] = useState('library');
  const [dialog, setDialog] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [exams, setExams] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0 });
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [toast, setToast] = useState('');
  const [deleting, setDeleting] = useState(false);
  const token = session?.token;
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));
  const filterCount = useMemo(() => Object.values(appliedFilters).filter(Boolean).length, [appliedFilters]);

  const notify = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setMode('library');
  }, []);

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    api.me(token).then((result) => {
      if (!active) return;
      const updated = { token, user: result.user };
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      setSession(updated);
    }).catch((error) => {
      if (active && error.status === 401) clearSession();
    });
    return () => { active = false; };
  }, [token, clearSession]);

  useEffect(() => {
    function onUnauthorized() {
      clearSession();
      notify('Votre session a expiré. Connectez-vous à nouveau.');
    }
    window.addEventListener('campus:unauthorized', onUnauthorized);
    return () => window.removeEventListener('campus:unauthorized', onUnauthorized);
  }, [clearSession, notify]);

  useEffect(() => {
    if (mode === 'mine' && !token) {
      setMode('library');
      return undefined;
    }
    let active = true;
    setLoading(true);
    setListError('');
    const load = mode === 'mine'
      ? api.myExams(token, { filters: appliedFilters, page })
      : api.exams({ filters: appliedFilters, page });
    load.then((result) => {
      if (!active) return;
      setExams(result.data);
      setPagination(result.pagination);
    }).catch((error) => {
      if (active) setListError(error.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [mode, token, appliedFilters, page, refresh]);

  const loadExam = useCallback(async (id, addToHistory = false) => {
    if (addToHistory) {
      const url = new URL(window.location.href);
      url.searchParams.set('exam', id);
      window.history.pushState({ examId: id }, '', url);
    }
    setDialog({ type: 'exam', exam: null, loading: true });
    try {
      const result = await api.exam(id);
      setDialog({ type: 'exam', exam: result.data, loading: false });
    } catch (error) {
      setDialog(null);
      notify(error.message);
    }
  }, [notify]);

  useEffect(() => {
    function onPopState() {
      const id = new URLSearchParams(window.location.search).get('exam');
      if (id) loadExam(id);
      else setDialog((current) => current?.type === 'exam' ? null : current);
    }
    window.addEventListener('popstate', onPopState);
    const id = new URLSearchParams(window.location.search).get('exam');
    if (id) loadExam(id);
    return () => window.removeEventListener('popstate', onPopState);
  }, [loadExam]);

  function applyFilters(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setAppliedFilters({
      subject: String(form.get('subject') || ''),
      program: String(form.get('program') || ''),
      university: String(form.get('university') || ''),
      faculty: String(form.get('faculty') || '')
    });
    setPage(1);
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
  }

  function closeDialog() {
    if (dialog?.type === 'exam') {
      const url = new URL(window.location.href);
      url.searchParams.delete('exam');
      window.history.replaceState({}, '', url);
    }
    setDialog(null);
  }

  function openAuth(nextMode = 'login') {
    setAuthMode(nextMode);
    setDialog({ type: 'auth' });
    setMobileMenuOpen(false);
  }

  function openUpload() {
    if (!token) {
      openAuth('login');
      notify('Connectez-vous pour déposer une épreuve.');
      return;
    }
    setDialog({ type: 'upload' });
    setMobileMenuOpen(false);
  }

  function onAuthenticated(result) {
    const updated = { token: result.token, user: result.user };
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    setSession(updated);
    setDialog(null);
    notify(`Bienvenue, ${result.user.displayName} !`);
  }

  function onUploaded(exam) {
    setDialog(null);
    setRefresh((value) => value + 1);
    notify('Votre épreuve a été publiée avec succès.');
    loadExam(exam.id, true);
  }

  async function removeExam(id) {
    if (!window.confirm('Supprimer définitivement cette épreuve ?')) return;
    setDeleting(true);
    try {
      await api.deleteExam(token, id);
      closeDialog();
      setRefresh((value) => value + 1);
      notify('Épreuve supprimée.');
    } catch (error) {
      notify(error.message);
    } finally {
      setDeleting(false);
    }
  }

  function switchMode(nextMode) {
    if (nextMode === 'mine' && !token) {
      openAuth();
      return;
    }
    setMode(nextMode);
    setPage(1);
    setMobileMenuOpen(false);
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a aria-label="Campus Papers, accueil" className="brand" href="/" onClick={(event) => {
          event.preventDefault();
          setMode('library');
          resetFilters();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}>
          <span className="brand-icon"><Icon name="book" size={21} /></span>
          <span>campus<span className="brand-accent">papers</span><small>La mémoire des promos</small></span>
        </a>
        <button aria-expanded={mobileMenuOpen} aria-label="Ouvrir le menu"
          className="mobile-menu-button icon-button" onClick={() => setMobileMenuOpen((open) => !open)} type="button">
          <Icon name="menu" />
        </button>
        <nav className={`header-nav${mobileMenuOpen ? ' header-nav--open' : ''}`}>
          <button className={mode === 'library' ? 'nav-link nav-link--active' : 'nav-link'} onClick={() => switchMode('library')} type="button">Explorer</button>
          <button className={mode === 'mine' ? 'nav-link nav-link--active' : 'nav-link'} onClick={() => switchMode('mine')} type="button">Mes dépôts</button>
        </nav>
        <div className="header-actions">
          {session ? <>
            <span className="user-greeting"><span className="user-avatar">{session.user.displayName.slice(0, 1).toUpperCase()}</span><span>{session.user.displayName}</span></span>
            <button aria-label="Se déconnecter" className="icon-button" onClick={() => { clearSession(); notify('Vous êtes déconnecté.'); }} title="Se déconnecter" type="button"><Icon name="logout" /></button>
          </> : <button className="button button--quiet header-login" onClick={() => openAuth()} type="button">Se connecter</button>}
          <button className="button button--primary header-upload" onClick={openUpload} type="button"><Icon name="upload" size={16} /><span>Déposer une épreuve</span></button>
        </div>
      </header>

      <main>
        {mode === 'library' && <section className="hero">
          <div className="hero-copy">
            <span className="hero-kicker"><span className="hero-kicker__dot" /> LA BIBLIOTHÈQUE DES ÉTUDIANTS</span>
            <h1>Les bonnes révisions<br />se <em>partagent.</em></h1>
            <p>Retrouvez les épreuves des années précédentes. Une ressource précieuse, partagée par celles et ceux qui sont passés avant vous.</p>
            <div className="hero-actions">
              <button className="button button--light" onClick={() => document.getElementById('bibliotheque')?.scrollIntoView({ behavior: 'smooth' })} type="button">Explorer les épreuves <Icon name="arrow" size={17} /></button>
              <span className="hero-trust"><Icon name="user" size={16} /> Entre étudiants, tout simplement</span>
            </div>
          </div>
          <div aria-hidden="true" className="hero-art">
            <div className="hero-orbit hero-orbit--one" /><div className="hero-orbit hero-orbit--two" />
            <div className="hero-sheet"><div className="hero-sheet__top"><span>CP / ARCHIVES</span><span>2025</span></div>
              <div className="hero-sheet__seal"><Icon name="book" size={28} /></div>
              <i /><i /><i /><div className="hero-sheet__footer"><span>ÉCONOMIE</span><span>ÉPREUVE N° 08</span></div>
            </div>
            <div className="floating-note"><span className="floating-note__icon"><Icon name="check" size={14} /></span><span><strong>Une promo plus solidaire</strong><small>Une épreuve à la fois</small></span></div>
          </div>
          <div className="hero-bottom"><span>POUR LES ÉTUDIANTS, PAR LES ÉTUDIANTS</span><div>UNIVERSITÉS · FILIÈRES · ÉPREUVES</div></div>
        </section>}

        <section className={`library-section${mode === 'mine' ? ' library-section--mine' : ''}`} id="bibliotheque">
          <div className="section-heading">
            <div><span className="eyebrow">{mode === 'mine' ? 'VOTRE CONTRIBUTION' : 'LA BIBLIOTHÈQUE'}</span>
              <h2>{mode === 'mine' ? 'Mes dépôts' : 'À vous de jouer.'}</h2>
              <p>{mode === 'mine' ? 'Retrouvez et gérez les épreuves que vous avez partagées.' : 'Explorez les épreuves partagées par votre communauté.'}</p>
            </div>
            <div className="library-count"><strong>{pagination.total.toLocaleString('fr-FR')}</strong><span>épreuve{pagination.total > 1 ? 's' : ''}<br />disponible{pagination.total > 1 ? 's' : ''}</span></div>
          </div>
          <form className="search-panel" id="exam-search-form" onSubmit={applyFilters}>
            <label className="search-field"><Icon name="search" size={19} />
              <input aria-label="Rechercher une matière" name="subject" onChange={(event) => setFilters({ ...filters, subject: event.target.value })} placeholder="Matière, mot-clé…" value={filters.subject} />
            </label>
            <span className="search-divider" />
            <label className="search-field search-field--filter"><Icon name="book" size={17} />
              <input aria-label="Filtrer par filière" name="program" onChange={(event) => setFilters({ ...filters, program: event.target.value })} placeholder="Filière" value={filters.program} />
            </label>
            <span className="search-divider" />
            <label className="search-field search-field--filter"><Icon name="school" size={17} />
              <input aria-label="Filtrer par université" name="university" onChange={(event) => setFilters({ ...filters, university: event.target.value })} placeholder="Université" value={filters.university} />
            </label>
            <button className="button button--primary search-submit" type="submit"><Icon name="search" size={17} /><span>Rechercher</span></button>
          </form>
          <div className="filter-toolbar">
            <span><Icon name="school" size={15} /> École / faculté</span>
            <input aria-label="Filtrer par école ou faculté" form="exam-search-form"
              onChange={(event) => setFilters({ ...filters, faculty: event.target.value })}
              onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.form.requestSubmit(); } }}
              placeholder="Ex. Faculté des sciences" value={filters.faculty} />
            {filterCount > 0 && <button className="clear-filters" onClick={resetFilters} type="button">Effacer les filtres ({filterCount})</button>}
          </div>
          <div className="results-toolbar">
            <div className="results-label"><span className="results-indicator" />{mode === 'mine' ? 'VOS ÉPREUVES' : 'DERNIÈRES ÉPREUVES'}<span className="results-label__count">{pagination.total}</span></div>
            {mode === 'mine' && <button className="text-button" onClick={openUpload} type="button"><Icon name="upload" size={15} /> Ajouter une épreuve</button>}
          </div>
          {listError && <div className="inline-error" role="alert">{listError} <button onClick={() => setRefresh((value) => value + 1)} type="button">Réessayer</button></div>}
          {loading ? <div aria-label="Chargement des épreuves" className="exam-grid">
            {Array.from({ length: 6 }, (_, index) => <div className="exam-skeleton" key={index}><span /><div><i /><i /><i /></div></div>)}
          </div> : exams.length ? <div className="exam-grid">
            {exams.map((exam, index) => <ExamCard exam={exam} index={index} key={exam.id} onOpen={(id) => loadExam(id, true)} />)}
          </div> : <div className="empty-state">
            <div className="empty-state__icon"><Icon name={mode === 'mine' ? 'upload' : 'search'} size={26} /></div>
            <h3>{mode === 'mine' ? 'Votre bibliothèque commence ici.' : filterCount ? 'Aucune épreuve trouvée.' : 'La première épreuve est à vous.'}</h3>
            <p>{mode === 'mine' ? 'Déposez un ancien sujet pour aider les étudiants de votre filière.' : filterCount ? 'Essayez un autre mot-clé ou élargissez vos filtres.' : 'Partagez un sujet et donnez un coup de pouce à votre promo.'}</p>
            {mode === 'mine' || !filterCount
              ? <button className="button button--primary" onClick={openUpload} type="button"><Icon name="upload" size={16} /> Déposer une épreuve</button>
              : <button className="button button--quiet" onClick={resetFilters} type="button">Effacer les filtres</button>}
          </div>}
          {!loading && totalPages > 1 && <div className="pagination">
            <span>Page {page} sur {totalPages}</span>
            <div>
              <button disabled={page <= 1} onClick={() => { setPage((value) => value - 1); document.getElementById('bibliotheque')?.scrollIntoView({ behavior: 'smooth' }); }} type="button">Précédent</button>
              <button disabled={page >= totalPages} onClick={() => { setPage((value) => value + 1); document.getElementById('bibliotheque')?.scrollIntoView({ behavior: 'smooth' }); }} type="button">Suivant <Icon name="arrow" size={14} /></button>
            </div>
          </div>}
        </section>

        <section className="contribute-banner">
          <div className="contribute-icon"><Icon name="spark" size={24} /></div>
          <div><span className="eyebrow">FAITES CIRCULER LE SAVOIR</span><h2>Une épreuve peut tout changer.</h2><p>Votre ancien sujet peut aider quelqu’un à réussir demain.</p></div>
          <button className="button button--light" onClick={openUpload} type="button">Partager une épreuve <Icon name="arrow" size={16} /></button>
        </section>
      </main>
      <footer className="site-footer">
        <a className="brand brand--footer" href="/" onClick={(event) => event.preventDefault()}><span className="brand-icon"><Icon name="book" size={18} /></span><span>campus<span className="brand-accent">papers</span></span></a>
        <span>Apprendre ensemble, réussir ensemble.</span>
        <span className="footer-note"><Icon name="spark" size={14} /> Un projet étudiant, pour les étudiants</span>
      </footer>
      {dialog?.type === 'auth' && <AuthDialog mode={authMode} onAuthenticated={onAuthenticated} onClose={closeDialog} setMode={setAuthMode} />}
      {dialog?.type === 'upload' && <UploadDialog onClose={closeDialog} onUploaded={onUploaded} token={token} />}
      {dialog?.type === 'exam' && <ExamDialog deleting={deleting} exam={dialog.exam}
        isMine={mode === 'mine'} loading={dialog.loading} notify={notify}
        onClose={closeDialog} onDelete={removeExam} />}
      {toast && <div className="toast" role="status"><span><Icon name="check" size={15} /></span>{toast}</div>}
    </div>
  );
}
