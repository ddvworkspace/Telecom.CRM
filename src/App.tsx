import React, { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  orderBy, 
  limit,
  deleteDoc,
  Timestamp,
  serverTimestamp,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { 
  db, 
  auth,
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  type User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  initializeApp,
  deleteApp,
  getAuth,
  firebaseConfig,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from './firebase';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Briefcase, 
  MessageSquare, 
  Plus, 
  ChevronRight, 
  Search, 
  LogOut,
  Settings,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Camera,
  ArrowRight,
  Shield,
  User as UserIcon,
  Mail,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type Role = 'COMMERCIAL_DIRECTOR' | 'PM' | 'TECH_DEPT' | 'PARTNER';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  patronymic?: string;
  role: Role;
  email: string;
  phone?: string;
  status?: 'ACTIVE' | 'INVITED';
}

interface Company {
  id: string;
  legalName: string;
  shortName: string;
  inn: string;
  kpp: string;
  legalAddress: string;
  actualAddress: string;
  phone: string;
  email: string;
  responsibleEmployeeId: string;
}

interface ContactPerson {
  id: string;
  firstName: string;
  lastName: string;
  patronymic?: string;
  phone: string;
  email: string;
  position?: string;
  companyIds: string[];
  responsibleEmployeeId?: string;
}

type ProjectStage = 
  | 'REQUEST_RECEIVED' 
  | 'ASSIGNED_TO_PM' 
  | 'COSTING_IN_PROGRESS' 
  | 'CP_PREPARATION' 
  | 'SENDING_CP'
  | 'CP_SENT' 
  | 'CONTRACTING' 
  | 'IMPLEMENTATION' 
  | 'INVOICING'
  | 'PAYMENT_CONTROL'
  | 'CONNECTED'
  | 'COMPLETED' 
  | 'FAILED';

interface Project {
  id: string;
  name: string;
  stage: ProjectStage;
  oneTimeFee?: number;
  monthlyFee?: number;
  companyId: string;
  contactPersonIds: string[];
  billingAddress?: string;
  additionalInfo?: string;
  plannedDate?: string;
  channelType?: string;
  channelSpeed?: string;
  endPoint1?: string;
  endPoint2?: string;
  orderLifespan?: string;
  responsibleEmployeeId: string;
  partnerCost?: number;
  techDeptCost?: number;
  macAddress?: string;
  portSpeed?: string;
  techReportText?: string;
  requiredEquipment?: string;
  photos?: string[];
  isSurvey?: boolean;
  mainProjectId?: string;
  createdAt: any;
}

interface Message {
  id: string;
  targetId: string;
  senderId: string;
  text: string;
  createdAt: any;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

// --- Components ---

const ConfirmModal = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel 
}: { 
  isOpen: boolean, 
  title: string, 
  message: string, 
  onConfirm: () => void, 
  onCancel: () => void 
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl p-6 shadow-2xl"
      >
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-sm text-white/60 mb-6">{message}</p>
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-white/10 rounded-lg font-bold hover:bg-white/5 transition-all text-sm"
          >
            Отмена
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all text-sm"
          >
            Удалить
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ErrorDisplay = ({ error, onClose }: { error: FirestoreErrorInfo | null, onClose: () => void }) => {
  if (!error) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md bg-red-600 text-white p-4 rounded-xl shadow-2xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4 border border-white/20">
      <AlertCircle className="shrink-0 mt-0.5" size={20} />
      <div className="flex-1">
        <p className="font-bold text-sm">Ошибка системы</p>
        <p className="text-xs opacity-90 mt-1 leading-relaxed">
          {error.error.includes('Missing or insufficient permissions') 
            ? 'У вас недостаточно прав для выполнения этого действия. Убедитесь, что ваш профиль сотрудника создан правильно.' 
            : error.error}
        </p>
        <div className="mt-2 pt-2 border-t border-white/10 flex justify-between items-center">
          <span className="text-[8px] font-mono opacity-50 uppercase tracking-widest">{error.operationType} @ {error.path}</span>
          <button onClick={onClose} className="text-[10px] font-bold uppercase tracking-tighter hover:underline">Закрыть</button>
        </div>
      </div>
    </div>
  );
};

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 w-full px-4 py-3 text-sm font-medium transition-colors rounded-lg",
      active ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
    )}
  >
    <Icon size={20} />
    {label}
  </button>
);

const StageBadge = ({ stage }: { stage: ProjectStage }) => {
  const config: Record<ProjectStage, { label: string, color: string, icon: any }> = {
    REQUEST_RECEIVED: { label: 'Новая заявка', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: AlertCircle },
    ASSIGNED_TO_PM: { label: 'У Проджекта', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', icon: Clock },
    COSTING_IN_PROGRESS: { label: 'Расчет стоимости', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: Search },
    CP_PREPARATION: { label: 'Подготовка КП', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', icon: FileText },
    SENDING_CP: { label: 'Отправка КП', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20', icon: ArrowRight },
    CP_SENT: { label: 'КП отправлено', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: ArrowRight },
    CONTRACTING: { label: 'Подготовка договора', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', icon: CheckCircle2 },
    IMPLEMENTATION: { label: 'Подключение', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', icon: Settings },
    INVOICING: { label: 'Счета и акты', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: FileText },
    PAYMENT_CONTROL: { label: 'Контроль оплаты', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: Clock },
    CONNECTED: { label: 'Подключено', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle2 },
    COMPLETED: { label: 'Завершено', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle2 },
    FAILED: { label: 'Сделка провалена', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: AlertCircle },
  };

  const { label, color, icon: Icon } = config[stage];

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", color)}>
      <Icon size={12} />
      {label}
    </span>
  );
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'survey_projects' | 'companies' | 'contacts' | 'employees' | 'profile'>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [projectTab, setProjectTab] = useState<'active' | 'success' | 'failed'>('active');
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [lastError, setLastError] = useState<FirestoreErrorInfo | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ collection: string, id: string, title?: string } | null>(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // Profile / Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [passwordChangeStatus, setPasswordChangeStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    if (lastError) {
      const timer = setTimeout(() => setLastError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [lastError]);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      setInitError(event.message || 'Неизвестная ошибка выполнения');
    };
    window.addEventListener('error', handleError);
    
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const docRef = doc(db, 'employees', u.uid);
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile({ id: docSnap.id, ...docSnap.data() } as Employee);
          } else {
            // Auto-create profile for first-time login
            const names = (u.displayName || 'Сотрудник').split(' ');
            const newProfile = {
              firstName: names[0] || 'Имя',
              lastName: names[1] || 'Фамилия',
              role: 'COMMERCIAL_DIRECTOR' as Role,
              email: u.email || '',
            };
            await setDoc(docRef, newProfile);
            setProfile({ id: u.uid, ...newProfile });
          }
        } catch (error: any) {
          console.error('Init error:', error);
          setInitError(error.message || String(error));
          setLastError(handleFirestoreError(error, OperationType.GET, 'employees/' + u.uid));
        }
      }
      setLoading(false);
    }, (error: any) => {
      console.error('Auth state error:', error);
      setInitError(error.message || String(error));
      setLoading(false);
    });
    return () => {
      window.removeEventListener('error', handleError);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
    }, (error) => setLastError(handleFirestoreError(error, OperationType.LIST, 'projects')));

    const unsubCompanies = onSnapshot(collection(db, 'companies'), (snap) => {
      setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Company)));
    }, (error) => setLastError(handleFirestoreError(error, OperationType.LIST, 'companies')));

    const unsubContacts = onSnapshot(collection(db, 'contactPersons'), (snap) => {
      setContacts(snap.docs.map(d => ({ id: d.id, ...d.data() } as ContactPerson)));
    }, (error) => setLastError(handleFirestoreError(error, OperationType.LIST, 'contactPersons')));

    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snap) => {
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() } as Employee)));
    }, (error) => setLastError(handleFirestoreError(error, OperationType.LIST, 'employees')));

    return () => {
      unsubProjects();
      unsubCompanies();
      unsubContacts();
      unsubEmployees();
    };
  }, [user]);

  const handleLogin = () => signInWithPopup(auth, new GoogleAuthProvider());
  const handleLogout = () => signOut(auth);

  const [showModal, setShowModal] = useState<'project' | 'company' | 'contact' | 'profile' | 'employee' | null>(null);
  const [editingEntity, setEditingEntity] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  const handleCreateAdminProfile = async () => {
    if (!user) return;
    try {
      setLoading(true);
      console.log('Creating admin profile for:', user.email);
      await setDoc(doc(db, 'employees', user.uid), {
        firstName: 'Администратор',
        lastName: 'Системы',
        email: user.email,
        role: 'COMMERCIAL_DIRECTOR',
        phone: '',
        patronymic: ''
      });
      console.log('Admin profile created');
      // Profile will be updated via onSnapshot
    } catch (error) {
      console.error('Failed to create profile:', error);
      setLastError(handleFirestoreError(error, OperationType.CREATE, 'employees'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    if (companies.length === 0) {
      alert('Сначала создайте хотя бы одну компанию!');
      return;
    }
    
    try {
      const projectData = {
        name: formData.name,
        companyId: formData.companyId || (editingEntity ? editingEntity.companyId : companies[0].id),
        contactPersonIds: formData.contactPersonIds || [],
        oneTimeFee: Number(formData.oneTimeFee) || 0,
        monthlyFee: Number(formData.monthlyFee) || 0,
        billingAddress: formData.billingAddress || '',
        additionalInfo: formData.additionalInfo || '',
        plannedDate: formData.plannedDate || '',
        channelType: formData.channelType || '',
        channelSpeed: formData.channelSpeed || '',
        endPoint1: formData.endPoint1 || '',
        endPoint2: formData.endPoint2 || '',
        orderLifespan: formData.orderLifespan || '',
        macAddress: formData.macAddress || '',
        portSpeed: formData.portSpeed || '',
        techReportText: formData.techReportText || '',
      };

      if (editingEntity) {
        await updateDoc(doc(db, 'projects', editingEntity.id), projectData);
      } else {
        await addDoc(collection(db, 'projects'), {
          ...projectData,
          stage: 'REQUEST_RECEIVED',
          responsibleEmployeeId: profile?.id || user?.uid,
          createdAt: serverTimestamp(),
        });
      }
      setShowModal(null);
      setEditingEntity(null);
      setFormData({});
    } catch (error) {
      setLastError(handleFirestoreError(error, editingEntity ? OperationType.UPDATE : OperationType.CREATE, 'projects'));
    }
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.shortName || !formData.inn) return;
    
    try {
      const data = {
        shortName: formData.shortName,
        legalName: formData.legalName || formData.shortName,
        inn: formData.inn,
        kpp: formData.kpp || '',
        legalAddress: formData.legalAddress || '',
        actualAddress: formData.actualAddress || formData.address || 'Адрес не указан',
        phone: formData.phone || '',
        email: formData.email || '',
        responsibleEmployeeId: profile?.id || user?.uid
      };

      if (editingEntity) {
        await updateDoc(doc(db, 'companies', editingEntity.id), data);
      } else {
        await addDoc(collection(db, 'companies'), data);
      }
      setShowModal(null);
      setEditingEntity(null);
      setFormData({});
    } catch (error) {
      setLastError(handleFirestoreError(error, editingEntity ? OperationType.UPDATE : OperationType.CREATE, 'companies'));
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName) return;
    
    try {
      const data = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        patronymic: formData.patronymic || '',
        phone: formData.phone || '',
        email: formData.email || '',
        position: formData.position || '',
        companyIds: formData.companyIds || [],
        responsibleEmployeeId: profile?.id || user?.uid
      };

      if (editingEntity) {
        await updateDoc(doc(db, 'contactPersons', editingEntity.id), data);
      } else {
        await addDoc(collection(db, 'contactPersons'), data);
      }
      setShowModal(null);
      setEditingEntity(null);
      setFormData({});
    } catch (error) {
      setLastError(handleFirestoreError(error, editingEntity ? OperationType.UPDATE : OperationType.CREATE, 'contactPersons'));
    }
  };

  const handleDelete = (collectionName: string, id: string, title?: string) => {
    setDeleteConfirm({ collection: collectionName, id, title });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { collection: col, id } = deleteConfirm;
    try {
      await deleteDoc(doc(db, col, id));
      setDeleteConfirm(null);
      if (selectedProject?.id === id) setSelectedProject(null);
      if (selectedCompany?.id === id) setSelectedCompany(null);
    } catch (error) {
      setLastError(handleFirestoreError(error, OperationType.DELETE, col + '/' + id));
      setDeleteConfirm(null);
    }
  };

  const handleSendInvitation = (email: string) => {
    // In a real app, this would call a Cloud Function or an Email API
    console.log('Sending invitation to:', email);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.role) return;

    try {
      const data = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        patronymic: formData.patronymic || '',
        email: formData.email,
        role: formData.role,
        phone: formData.phone || '',
      };

      if (editingEntity) {
        await updateDoc(doc(db, 'employees', editingEntity.id), data);
      } else {
        // Create user in Auth using a secondary app instance to avoid signing out the admin
        if (formData.password) {
          const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
          const secondaryAuth = getAuth(secondaryApp);
          try {
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
            const uid = userCredential.user.uid;
            
            // Create employee doc with the same UID
            await setDoc(doc(db, 'employees', uid), { ...data, status: 'ACTIVE' });
            
            await signOut(secondaryAuth);
          } finally {
            await deleteApp(secondaryApp);
          }
        } else {
          // Fallback if no password provided (though we'll make it required)
          await addDoc(collection(db, 'employees'), { ...data, status: 'INVITED' });
        }
        handleSendInvitation(formData.email);
      }
      
      setShowModal(null);
      setEditingEntity(null);
      setFormData({});
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        alert('Этот email уже зарегистрирован в системе');
      } else if (error.code === 'auth/operation-not-allowed') {
        alert('Ошибка: Вход по Email/Паролю отключен в консоли Firebase. Пожалуйста, включите его в разделе Authentication -> Sign-in method.');
      } else {
        setLastError(handleFirestoreError(error, editingEntity ? OperationType.UPDATE : OperationType.CREATE, 'employees'));
      }
    }
  };

  const createProject = async (name: string, companyId: string) => {
    if (!profile) return;
    try {
      await addDoc(collection(db, 'projects'), {
        name,
        companyId,
        stage: 'REQUEST_RECEIVED',
        responsibleEmployeeId: profile.id,
        createdAt: Timestamp.now(),
        contactPersonIds: []
      });
    } catch (error) {
      setLastError(handleFirestoreError(error, OperationType.CREATE, 'projects'));
    }
  };

  const updateProjectStage = async (projectId: string, nextStage: ProjectStage, additionalData: any = {}) => {
    try {
      const projectRef = doc(db, 'projects', projectId);
      
      // If moving to SENDING_CP, assign Commercial Director
      if (nextStage === 'SENDING_CP') {
        const cd = employees.find(e => e.role === 'COMMERCIAL_DIRECTOR');
        if (cd) {
          additionalData.responsibleEmployeeId = cd.id;
        }
      }

      // If moving to IMPLEMENTATION (Start Connection), update survey project
      if (nextStage === 'IMPLEMENTATION') {
        const mainProject = projects.find(p => p.id === projectId);
        if (mainProject && !mainProject.isSurvey) {
          const survey = projects.find(p => p.mainProjectId === projectId && p.isSurvey);
          if (survey) {
            await updateDoc(doc(db, 'projects', survey.id), {
              stage: 'IMPLEMENTATION'
            });
          }
        }
      }

      await updateDoc(projectRef, {
        stage: nextStage,
        ...additionalData
      });

      // If moving to COSTING_IN_PROGRESS, create a Survey Project
      if (nextStage === 'COSTING_IN_PROGRESS') {
        const mainProject = projects.find(p => p.id === projectId);
        if (mainProject && !mainProject.isSurvey) {
          // Check if survey already exists
          const existingSurvey = projects.find(p => p.mainProjectId === projectId && p.isSurvey);
          if (!existingSurvey) {
            await addDoc(collection(db, 'projects'), {
              name: `Технический проект: ${mainProject.name}`,
              companyId: mainProject.companyId,
              contactPersonIds: mainProject.contactPersonIds || [],
              billingAddress: mainProject.billingAddress || '',
              additionalInfo: mainProject.additionalInfo || '',
              plannedDate: mainProject.plannedDate || '',
              channelType: mainProject.channelType || '',
              channelSpeed: mainProject.channelSpeed || '',
              endPoint1: mainProject.endPoint1 || '',
              endPoint2: mainProject.endPoint2 || '',
              orderLifespan: mainProject.orderLifespan || '',
              stage: 'COSTING_IN_PROGRESS',
              responsibleEmployeeId: additionalData.techSpecialistId || '', // Tech Dept will be assigned
              isSurvey: true,
              mainProjectId: projectId,
              createdAt: serverTimestamp(),
            });
          }
        }
      }

      // If a survey project is completed (COSTING stage), transfer data to main project
      if (nextStage === 'CP_PREPARATION') {
        const surveyProject = projects.find(p => p.id === projectId);
        if (surveyProject?.isSurvey && surveyProject.mainProjectId) {
          await updateDoc(doc(db, 'projects', surveyProject.mainProjectId), {
            techDeptCost: additionalData.techDeptCost || surveyProject.techDeptCost || 0,
            requiredEquipment: additionalData.requiredEquipment || surveyProject.requiredEquipment || '',
            stage: 'CP_PREPARATION'
          });
          // Also mark the survey project itself as COMPLETED
          await updateDoc(doc(db, 'projects', projectId), {
            stage: 'COMPLETED'
          });
        }
      }

      // If a survey project is completed (IMPLEMENTATION stage), transfer report to main project
      if (nextStage === 'CONNECTED') {
        const surveyProject = projects.find(p => p.id === projectId);
        if (surveyProject?.isSurvey && surveyProject.mainProjectId) {
          await updateDoc(doc(db, 'projects', surveyProject.mainProjectId), {
            macAddress: additionalData.macAddress || surveyProject.macAddress || '',
            portSpeed: additionalData.portSpeed || surveyProject.portSpeed || '',
            techReportText: additionalData.techReportText || surveyProject.techReportText || '',
            photos: additionalData.photos || surveyProject.photos || [],
            stage: 'INVOICING'
          });
        }
      }
    } catch (error) {
      setLastError(handleFirestoreError(error, OperationType.UPDATE, 'projects/' + projectId));
    }
  };

  useEffect(() => {
    (window as any).editProject = (p: Project) => {
      setEditingEntity(p);
      setFormData(p);
      setShowModal('project');
    };
    (window as any).selectProject = (p: Project) => {
      setSelectedProject(p);
      setActiveTab('projects');
    };
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white p-6">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
      {initError && (
        <div className="max-w-md text-center space-y-2">
          <p className="text-red-400 text-sm font-mono">Ошибка инициализации:</p>
          <p className="text-white/40 text-xs font-mono break-all">{initError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs hover:bg-white/10 transition-colors"
          >
            Перезагрузить страницу
          </button>
        </div>
      )}
    </div>
  );

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeStatus(null);

    if (newPassword !== confirmPassword) {
      setPasswordChangeStatus({ type: 'error', message: 'Пароли не совпадают' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordChangeStatus({ type: 'error', message: 'Пароль должен быть не менее 6 символов' });
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Пользователь не авторизован');

      // If user is logged in via email/password, we might need to re-authenticate
      if (user.providerData.some(p => p.providerId === 'password')) {
        const credential = EmailAuthProvider.credential(user.email!, currentPassword);
        await reauthenticateWithCredential(user, credential);
      }

      await updatePassword(user, newPassword);
      setPasswordChangeStatus({ type: 'success', message: 'Пароль успешно изменен' });
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
    } catch (error: any) {
      console.error('Password change error:', error);
      if (error.code === 'auth/wrong-password') {
        setPasswordChangeStatus({ type: 'error', message: 'Неверный текущий пароль' });
      } else {
        setPasswordChangeStatus({ type: 'error', message: 'Ошибка при смене пароля: ' + error.message });
      }
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/operation-not-allowed') {
        setLoginError('Вход по Email/Паролю отключен в консоли Firebase. Пожалуйста, включите его.');
      } else {
        setLoginError('Неверный email или пароль');
      }
    }
  };

  if (!user) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8"
      >
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold tracking-tighter uppercase italic">Telecom CRM</h1>
          <p className="text-white/40 font-mono text-xs uppercase tracking-widest">Система управления подключениями</p>
        </div>

        <div className="bg-white/5 border border-white/10 p-8 rounded-2xl space-y-6">
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Email</label>
              <input 
                type="email" 
                required
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Пароль</label>
              <div className="relative">
                <input 
                  type={showLoginPassword ? "text" : "password"} 
                  required
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20 pr-12"
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {loginError && <p className="text-red-400 text-xs">{loginError}</p>}
            <button 
              type="submit"
              className="w-full py-4 bg-white text-black font-bold uppercase tracking-tighter hover:bg-white/90 transition-colors rounded-xl"
            >
              Войти
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#050505] px-2 text-white/20">Или</span>
            </div>
          </div>

          <button 
            onClick={handleLogin}
            className="w-full py-4 border border-white/10 text-white font-bold uppercase tracking-tighter hover:bg-white/5 transition-colors rounded-xl flex items-center justify-center gap-2"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" referrerPolicy="no-referrer" />
            Войти через Google
          </button>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#050505] text-white overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 flex flex-col p-4">
        <div className="mb-8 px-4">
          <h2 className="text-xl font-bold italic tracking-tighter">TELECOM.CRM</h2>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest text-white/40 font-mono">Система онлайн</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <SidebarItem icon={LayoutDashboard} label="Дашборд" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setSelectedProject(null); setSelectedCompany(null); }} />
          <SidebarItem icon={Briefcase} label="Коммерческие проекты" active={activeTab === 'projects'} onClick={() => { setActiveTab('projects'); setSelectedProject(null); setSelectedCompany(null); }} />
          <SidebarItem icon={Search} label="Технические проекты" active={activeTab === 'survey_projects'} onClick={() => { setActiveTab('survey_projects'); setSelectedProject(null); setSelectedCompany(null); }} />
          <SidebarItem icon={Building2} label="Компании" active={activeTab === 'companies'} onClick={() => { setActiveTab('companies'); setSelectedProject(null); setSelectedCompany(null); }} />
          <SidebarItem icon={Users} label="Контакты" active={activeTab === 'contacts'} onClick={() => { setActiveTab('contacts'); setSelectedProject(null); setSelectedCompany(null); }} />
          <SidebarItem icon={Settings} label="Персонал" active={activeTab === 'employees'} onClick={() => { setActiveTab('employees'); setSelectedProject(null); setSelectedCompany(null); }} />
          <SidebarItem icon={UserIcon} label="Профиль" active={activeTab === 'profile'} onClick={() => { setActiveTab('profile'); setSelectedProject(null); setSelectedCompany(null); }} />
        </nav>

        <div className="mt-auto pt-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
              {profile?.firstName[0]}{profile?.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.firstName} {profile?.lastName}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">{profile?.role.replace('_', ' ')}</p>
            </div>
            <button onClick={handleLogout} className="text-white/40 hover:text-white transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <header className="sticky top-0 z-10 bg-[#050505]/80 backdrop-blur-md border-b border-white/10 px-8 py-4 flex flex-wrap gap-4 items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight capitalize">
            {activeTab === 'dashboard' && 'Дашборд'}
            {activeTab === 'projects' && 'Коммерческие проекты'}
            {activeTab === 'survey_projects' && 'Технические проекты'}
            {activeTab === 'companies' && 'Компании'}
            {activeTab === 'contacts' && 'Контакты'}
            {activeTab === 'employees' && 'Персонал'}
            {activeTab === 'profile' && 'Мой профиль'}
          </h1>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
              <input 
                type="text" 
                placeholder="Поиск..." 
                className="bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-white/20 w-64"
              />
            </div>
            
            <div className="flex items-center gap-2">
              {activeTab === 'employees' && profile?.role === 'COMMERCIAL_DIRECTOR' && (
                <button 
                  onClick={() => setShowModal('employee')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-500/20"
                >
                  <Plus size={14} />
                  Сотрудник
                </button>
              )}
              <button 
                onClick={() => { setEditingEntity(null); setFormData({}); setShowModal('company'); }}
                className="px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition-all text-xs font-bold flex items-center gap-2 shadow-lg shadow-white/5"
              >
                <Plus size={14} />
                Компания
              </button>
              <button 
                onClick={() => { setEditingEntity(null); setFormData({}); setShowModal('contact'); }}
                className="px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition-all text-xs font-bold flex items-center gap-2 shadow-lg shadow-white/5"
              >
                <Plus size={14} />
                Контакт
              </button>
              <button 
                onClick={() => { setEditingEntity(null); setFormData({}); setShowModal('project'); }}
                className="px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition-all text-xs font-bold flex items-center gap-2 shadow-lg shadow-white/5"
              >
                <Plus size={14} />
                Коммерческий проект
              </button>
            </div>
          </div>
        </header>

        <div className="p-8">
          {!profile && !loading && (
            <div className="mb-8 p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-blue-400">Добро пожаловать в CRM!</h2>
                <p className="text-sm text-white/60">Для начала работы необходимо создать ваш профиль сотрудника.</p>
              </div>
              <button 
                onClick={handleCreateAdminProfile}
                className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
              >
                Создать мой профиль
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              >
                <StatCard label="Активные комм. проекты" value={projects.filter(p => p.stage !== 'COMPLETED' && p.stage !== 'FAILED' && !p.isSurvey).length} icon={Briefcase} />
                <StatCard label="Всего компаний" value={companies.length} icon={Building2} />
                <StatCard label="Ожидают КП" value={projects.filter(p => p.stage === 'CP_PREPARATION').length} icon={FileText} />
                <StatCard label="Тех. проекты в работе" value={projects.filter(p => p.isSurvey && p.stage !== 'COMPLETED').length} icon={Settings} />
                
                <div className="col-span-full mt-8">
                  <h3 className="text-lg font-bold mb-4 italic uppercase tracking-wider">Последняя активность</h3>
                  <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                    {projects.slice(0, 5).map(project => (
                      <div key={project.id} className="flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => { setSelectedProject(project); setActiveTab('projects'); }}>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                            <Briefcase size={20} className="text-white/40" />
                          </div>
                          <div>
                            <p className="font-medium">{project.name}</p>
                            <p className="text-xs text-white/40">{companies.find(c => c.id === project.companyId)?.shortName}</p>
                          </div>
                        </div>
                        <StageBadge stage={project.stage} />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'projects' && !selectedProject && (
              <motion.div 
                key="projects-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex gap-2 border-b border-white/10 pb-4">
                  {(['active', 'success', 'failed'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setProjectTab(t)}
                      className={cn(
                        "px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all",
                        projectTab === t ? "bg-white text-black" : "text-white/40 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {t === 'active' && 'Текущие'}
                      {t === 'success' && 'Успешные'}
                      {t === 'failed' && 'Проваленные'}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {projects
                    .filter(p => !p.isSurvey)
                    .filter(p => {
                      if (projectTab === 'active') return p.stage !== 'COMPLETED' && p.stage !== 'FAILED';
                      if (projectTab === 'success') return p.stage === 'COMPLETED';
                      return p.stage === 'FAILED';
                    })
                    .map(project => (
                      <div 
                        key={project.id} 
                        onClick={() => setSelectedProject(project)}
                        className="group bg-white/5 border border-white/10 p-6 rounded-xl hover:bg-white/[0.07] transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center gap-6">
                          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Briefcase size={24} className="text-white/60" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold tracking-tight">{project.name}</h3>
                            <div className="flex items-center gap-3 mt-1 text-sm text-white/40">
                              <span className="flex items-center gap-1"><Building2 size={14} /> {companies.find(c => c.id === project.companyId)?.shortName}</span>
                              <span>•</span>
                              <span>{project.createdAt ? format(project.createdAt.toDate(), 'dd MMM yyyy') : 'Recently'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="flex items-center gap-2 mr-4">
                            <button 
                              onClick={(e) => { e.stopPropagation(); (window as any).editProject(project); }}
                              className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                              title="Изменить"
                            >
                              <Settings size={14} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDelete('projects', project.id, `проект "${project.name}"`); }}
                              className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                              title="Удалить"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="text-right">
                            <p className="text-xs uppercase tracking-widest text-white/20 font-mono mb-1">Статус</p>
                            <StageBadge stage={project.stage} />
                          </div>
                          <ChevronRight className="text-white/20 group-hover:text-white transition-colors" />
                        </div>
                      </div>
                    ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'survey_projects' && !selectedProject && (
              <motion.div 
                key="survey-projects-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 gap-4">
                  {projects
                    .filter(p => p.isSurvey)
                    .map(project => (
                      <div 
                        key={project.id} 
                        onClick={() => setSelectedProject(project)}
                        className="bg-white/5 border border-white/10 p-6 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                            <Search size={20} className="text-white/40" />
                          </div>
                          <div>
                            <p className="font-medium">{project.name}</p>
                            <p className="text-xs text-white/40">{companies.find(c => c.id === project.companyId)?.shortName}</p>
                          </div>
                        </div>
                        <StageBadge stage={project.stage} />
                      </div>
                    ))}
                </div>
              </motion.div>
            )}

            {(activeTab === 'projects' || activeTab === 'survey_projects') && selectedProject && (
              <ProjectDetails 
                project={projects.find(p => p.id === selectedProject.id) || selectedProject} 
                onBack={() => setSelectedProject(null)} 
                onUpdate={async (next, data) => {
                  await updateProjectStage(selectedProject.id, next, data);
                  setSelectedProject(prev => prev ? { ...prev, stage: next, ...data } : null);
                }}
                companies={companies}
                employees={employees}
                projects={projects}
                profile={profile!}
                setLastError={setLastError}
                handleDelete={handleDelete}
              />
            )}
            
            {activeTab === 'companies' && !selectedCompany && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {companies.map(company => (
                  <div key={company.id} className="bg-white/5 border border-white/10 p-6 rounded-xl space-y-4 relative group cursor-pointer" onClick={() => setSelectedCompany(company)}>
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                        <Building2 size={24} />
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingEntity(company); setFormData(company); setShowModal('company'); }}
                          className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                          title="Изменить"
                        >
                          <Settings size={14} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete('companies', company.id, `компанию "${company.shortName}"`); }}
                          className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                          title="Удалить"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-lg font-bold truncate pr-2">{company.shortName}</h3>
                        <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest shrink-0">ИНН: {company.inn}</span>
                      </div>
                      <p className="text-xs text-white/40 truncate">{company.legalName}</p>
                    </div>
                    <div className="pt-4 border-t border-white/5 space-y-2 text-sm text-white/60">
                      <p className="flex items-center gap-2"><ArrowRight size={14} className="text-white/20" /> {company.actualAddress}</p>
                      <p className="flex items-center gap-2"><ArrowRight size={14} className="text-white/20" /> {company.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'companies' && selectedCompany && (
              <CompanyDetails 
                company={selectedCompany}
                onBack={() => setSelectedCompany(null)}
                projects={projects.filter(p => p.companyId === selectedCompany.id)}
                contacts={contacts.filter(c => c.companyIds?.includes(selectedCompany.id))}
                employees={employees}
                profile={profile!}
                setLastError={setLastError}
                setShowModal={setShowModal}
                setEditingEntity={setEditingEntity}
                setFormData={setFormData}
                handleDelete={handleDelete}
              />
            )}
            
            {activeTab === 'contacts' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contacts.map(contact => (
                  <div key={contact.id} className="bg-white/5 border border-white/10 p-6 rounded-xl space-y-4 group">
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 shrink-0">
                        <UserIcon size={24} />
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingEntity(contact); setFormData(contact); setShowModal('contact'); }}
                          className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                          title="Изменить"
                        >
                          <Settings size={14} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete('contactPersons', contact.id, `контакт "${contact.firstName} ${contact.lastName}"`); }}
                          className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                          title="Удалить"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{contact.firstName} {contact.lastName}</h3>
                      <p className="text-xs text-white/40">{contact.position || 'Должность не указана'}</p>
                    </div>
                    <div className="pt-4 border-t border-white/5 space-y-2 text-sm text-white/60">
                      <p className="flex items-center gap-2"><ArrowRight size={14} className="text-white/20" /> {contact.phone || 'Нет телефона'}</p>
                      <p className="flex items-center gap-2"><ArrowRight size={14} className="text-white/20" /> {contact.email || 'Нет email'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'employees' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {employees.map(emp => (
                  <div key={emp.id} className="bg-white/5 border border-white/10 p-6 rounded-xl space-y-4 group">
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                        <Shield size={24} />
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingEntity(emp); setFormData(emp); setShowModal('employee'); }}
                          className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                          title="Изменить"
                        >
                          <Settings size={14} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete('employees', emp.id, `сотрудника "${emp.firstName} ${emp.lastName}"`); }}
                          className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                          title="Удалить"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest block">{emp.role}</span>
                        {emp.status === 'INVITED' && (
                          <span className="text-[8px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/20 uppercase font-bold">Приглашен</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{emp.firstName} {emp.lastName}</h3>
                      <p className="text-xs text-white/40">{emp.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'profile' && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto space-y-8"
              >
                <div className="bg-white/5 border border-white/10 p-8 rounded-2xl">
                  <div className="flex items-center gap-6 mb-8">
                    <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center text-3xl font-bold">
                      {profile?.firstName[0]}{profile?.lastName[0]}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">{profile?.firstName} {profile?.lastName}</h2>
                      <p className="text-white/40 font-mono text-xs uppercase tracking-widest mt-1">{profile?.role.replace('_', ' ')}</p>
                      <p className="text-sm text-white/60 mt-2">{profile?.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-8">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Телефон</p>
                      <p className="font-medium">{profile?.phone || 'Не указан'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Статус</p>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <p className="font-medium">Активен</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-8 rounded-2xl">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Lock size={20} className="text-white/40" />
                    Безопасность
                  </h3>
                  
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    {user?.providerData.some(p => p.providerId === 'password') && (
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Текущий пароль</label>
                        <input 
                          type="password" 
                          required
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                        />
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Новый пароль</label>
                        <input 
                          type="password" 
                          required
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Подтвердите пароль</label>
                        <input 
                          type="password" 
                          required
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                        />
                      </div>
                    </div>

                    {passwordChangeStatus && (
                      <p className={cn(
                        "text-xs p-3 rounded-lg",
                        passwordChangeStatus.type === 'success' ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                      )}>
                        {passwordChangeStatus.message}
                      </p>
                    )}

                    <button 
                      type="submit"
                      className="px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-white/90 transition-all"
                    >
                      Сменить пароль
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <ErrorDisplay error={lastError} onClose={() => setLastError(null)} />
      <ConfirmModal 
        isOpen={!!deleteConfirm}
        title="Подтверждение удаления"
        message={`Вы уверены, что хотите удалить ${deleteConfirm?.title || 'эту запись'}? Это действие нельзя отменить.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* Modals */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-2xl p-8 shadow-2xl"
            >
              <h2 className="text-xl font-bold mb-6">
                {editingEntity ? 'Редактировать ' : 'Новый '}
                {showModal === 'project' && 'проект'}
                {showModal === 'company' && 'компанию'}
                {showModal === 'contact' && 'контакт'}
                {showModal === 'employee' && 'сотрудника'}
              </h2>

              <form onSubmit={
                showModal === 'project' ? handleAddProject :
                showModal === 'company' ? handleAddCompany :
                showModal === 'contact' ? handleAddContact :
                handleAddEmployee
              } className="space-y-4">
                {showModal === 'project' && (
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Название проекта</label>
                      <input 
                        autoFocus
                        required
                        type="text" 
                        value={formData.name || ''}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Разово (₽)</label>
                        <input 
                          type="number" 
                          value={formData.oneTimeFee || ''}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                          onChange={e => setFormData({...formData, oneTimeFee: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Ежемесячно (₽)</label>
                        <input 
                          type="number" 
                          value={formData.monthlyFee || ''}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                          onChange={e => setFormData({...formData, monthlyFee: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Адрес для выставления счета</label>
                      <input 
                        type="text" 
                        value={formData.billingAddress || ''}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                        onChange={e => setFormData({...formData, billingAddress: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Планируемая дата предоставления канала</label>
                      <input 
                        type="date" 
                        value={formData.plannedDate || ''}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                        onChange={e => setFormData({...formData, plannedDate: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Тип канала</label>
                        <input 
                          type="text" 
                          value={formData.channelType || ''}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                          onChange={e => setFormData({...formData, channelType: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Скорость канала</label>
                        <input 
                          type="text" 
                          value={formData.channelSpeed || ''}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                          onChange={e => setFormData({...formData, channelSpeed: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Точка окончания канала №1</label>
                      <input 
                        type="text" 
                        value={formData.endPoint1 || ''}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                        onChange={e => setFormData({...formData, endPoint1: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Точка окончания канала №2</label>
                      <input 
                        type="text" 
                        value={formData.endPoint2 || ''}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                        onChange={e => setFormData({...formData, endPoint2: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Срок действия заказа</label>
                      <input 
                        type="text" 
                        value={formData.orderLifespan || ''}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                        onChange={e => setFormData({...formData, orderLifespan: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Дополнительная информация</label>
                      <textarea 
                        value={formData.additionalInfo || ''}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20 min-h-[100px]"
                        onChange={e => setFormData({...formData, additionalInfo: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Компания</label>
                      <select 
                        value={formData.companyId || ''}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20 [&>option]:bg-[#111] [&>option]:text-white"
                        onChange={e => setFormData({...formData, companyId: e.target.value})}
                      >
                        <option value="">Выберите компанию</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.shortName}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Контактные лица</label>
                      <div className="space-y-2 max-h-48 overflow-y-auto bg-white/5 border border-white/10 rounded-xl p-2">
                        {contacts.map(c => (
                          <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white/5 p-1 rounded">
                            <input 
                              type="checkbox" 
                              checked={(formData.contactPersonIds || []).includes(c.id)}
                              onChange={e => {
                                const ids = formData.contactPersonIds || [];
                                if (e.target.checked) {
                                  setFormData({...formData, contactPersonIds: [...ids, c.id]});
                                } else {
                                  setFormData({...formData, contactPersonIds: ids.filter((id: string) => id !== c.id)});
                                }
                              }}
                            />
                            <div className="flex flex-col">
                              <span>{c.firstName} {c.lastName}</span>
                              <span className="text-[10px] text-white/20">
                                {companies.find(comp => comp.id === c.companyIds?.[0])?.shortName || 'Без компании'}
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {showModal === 'company' && (
                  <>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Краткое название</label>
                      <input 
                        autoFocus
                        required
                        type="text" 
                        value={formData.shortName || ''}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                        onChange={e => setFormData({...formData, shortName: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Полное название</label>
                      <input 
                        type="text" 
                        value={formData.legalName || ''}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                        onChange={e => setFormData({...formData, legalName: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">ИНН</label>
                        <input 
                          required
                          type="text" 
                          value={formData.inn || ''}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                          onChange={e => setFormData({...formData, inn: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">КПП</label>
                        <input 
                          type="text" 
                          value={formData.kpp || ''}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                          onChange={e => setFormData({...formData, kpp: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Фактический адрес</label>
                      <input 
                        type="text" 
                        value={formData.actualAddress || ''}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                        onChange={e => setFormData({...formData, actualAddress: e.target.value})}
                      />
                    </div>
                  </>
                )}

                {showModal === 'contact' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Имя</label>
                        <input 
                          autoFocus
                          required
                          type="text" 
                          value={formData.firstName || ''}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                          onChange={e => setFormData({...formData, firstName: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Фамилия</label>
                        <input 
                          required
                          type="text" 
                          value={formData.lastName || ''}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                          onChange={e => setFormData({...formData, lastName: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Должность</label>
                      <input 
                        type="text" 
                        value={formData.position || ''}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                        onChange={e => setFormData({...formData, position: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Телефон</label>
                      <input 
                        type="text" 
                        value={formData.phone || ''}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Email</label>
                      <input 
                        type="email" 
                        value={formData.email || ''}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                        onChange={e => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Компании</label>
                      <div className="space-y-2 max-h-32 overflow-y-auto bg-white/5 border border-white/10 rounded-xl p-2">
                        {companies.map(c => (
                          <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white/5 p-1 rounded">
                            <input 
                              type="checkbox" 
                              checked={(formData.companyIds || []).includes(c.id)}
                              onChange={e => {
                                const ids = formData.companyIds || [];
                                if (e.target.checked) {
                                  setFormData({...formData, companyIds: [...ids, c.id]});
                                } else {
                                  setFormData({...formData, companyIds: ids.filter((id: string) => id !== c.id)});
                                }
                              }}
                            />
                            {c.shortName}
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {showModal === 'employee' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Имя</label>
                        <input 
                          autoFocus
                          required
                          type="text" 
                          value={formData.firstName || ''}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                          onChange={e => setFormData({...formData, firstName: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Фамилия</label>
                        <input 
                          required
                          type="text" 
                          value={formData.lastName || ''}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                          onChange={e => setFormData({...formData, lastName: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Email</label>
                      <input 
                        required
                        type="email" 
                        value={formData.email || ''}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                        onChange={e => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    {!editingEntity && (
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Пароль</label>
                        <div className="relative">
                          <input 
                            required
                            type={showCreatePassword ? "text" : "password"} 
                            value={formData.password || ''}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20 pr-12"
                            onChange={e => setFormData({...formData, password: e.target.value})}
                            placeholder="Минимум 6 символов"
                          />
                          <button 
                            type="button"
                            onClick={() => setShowCreatePassword(!showCreatePassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                          >
                            {showCreatePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Роль</label>
                      <select 
                        required
                        value={formData.role || ''}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20 [&>option]:bg-[#111] [&>option]:text-white"
                        onChange={e => setFormData({...formData, role: e.target.value})}
                      >
                        <option value="">Выберите роль</option>
                        <option value="COMMERCIAL_DIRECTOR">Коммерческий директор</option>
                        <option value="PM">Проджект менеджер</option>
                        <option value="TECH_DEPT">Техотдел</option>
                        <option value="PARTNER">Партнер</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => { setShowModal(null); setEditingEntity(null); }}
                    className="flex-1 px-6 py-3 border border-white/10 rounded-xl font-bold hover:bg-white/5 transition-all"
                  >
                    Отмена
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-white/90 transition-all"
                  >
                    {editingEntity ? 'Сохранить' : 'Создать'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string, value: number, icon: any }) {
  return (
    <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/60">
          <Icon size={20} />
        </div>
      </div>
      <p className="text-3xl font-bold tracking-tighter">{value}</p>
      <p className="text-xs uppercase tracking-widest text-white/40 mt-1">{label}</p>
    </div>
  );
}

function ProjectDetails({ project, onBack, onUpdate, companies, employees, projects, profile, setLastError, handleDelete }: { 
  project: Project, 
  onBack: () => void, 
  onUpdate: (next: ProjectStage, data?: any) => void,
  companies: Company[],
  employees: Employee[],
  projects: Project[],
  profile: Employee,
  setLastError: (err: FirestoreErrorInfo | null) => void,
  handleDelete: (collection: string, id: string, title?: string) => void
}) {
  const company = companies.find(c => c.id === project.companyId);
  const responsible = employees.find(e => e.id === project.responsibleEmployeeId);
  const surveyProject = projects.find(p => p.mainProjectId === project.id && p.isSurvey);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'messages'), where('targetId', '==', project.id), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
    }, (error) => setLastError(handleFirestoreError(error, OperationType.LIST, 'messages')));
  }, [project.id]);

  const sendMessage = async () => {
    if (!newMsg.trim()) return;
    try {
      await addDoc(collection(db, 'messages'), {
        targetId: project.id,
        senderId: profile.id,
        text: newMsg,
        createdAt: Timestamp.now()
      });
      setNewMsg('');
    } catch (error) {
      setLastError(handleFirestoreError(error, OperationType.CREATE, 'messages'));
    }
  };

  const [selectedResponsible, setSelectedResponsible] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string[]>(project.photos || []);

  useEffect(() => {
    setPhotoPreview(project.photos || []);
  }, [project.photos]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const newPhotos = [...photoPreview, base64];
      setPhotoPreview(newPhotos);
      onUpdate(project.stage, { photos: newPhotos });
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-8"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm font-medium">
        <ArrowRight size={16} className="rotate-180" /> Назад к проектам
      </button>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-8">
          <section className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-4">
                <h2 className="text-3xl font-bold tracking-tight">{project.name}</h2>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { 
                      (window as any).editProject(project);
                    }}
                    className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                    title="Изменить"
                  >
                    <Settings size={16} />
                  </button>
                  <button 
                    onClick={() => { 
                      handleDelete('projects', project.id, `проект "${project.name}"`);
                    }}
                    className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                    title="Удалить"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-white/40 mt-1">Создан {project.createdAt ? format(project.createdAt.toDate(), 'PPP') : 'Недавно'}</p>
            </div>
            <StageBadge stage={project.stage} />
          </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/20 font-mono">Компания-клиент</label>
                  <p className="font-medium text-lg">{company?.shortName || 'Неизвестно'}</p>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/20 font-mono">Ответственный</label>
                  <p className="font-medium">{responsible?.firstName} {responsible?.lastName} ({responsible?.role === 'COMMERCIAL_DIRECTOR' ? 'Коммерческий директор' : responsible?.role})</p>
                </div>
                {project.billingAddress && (
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/20 font-mono">Адрес для счета</label>
                    <p className="text-sm">{project.billingAddress}</p>
                  </div>
                )}
                {project.plannedDate && (
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/20 font-mono">Планируемая дата</label>
                    <p className="text-sm">{project.plannedDate}</p>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {!project.isSurvey && (
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/20 font-mono">Стоимость</label>
                    <p className="font-medium">Разово: {project.oneTimeFee || 0} ₽</p>
                    <p className="font-medium">Ежемесячно: {project.monthlyFee || 0} ₽</p>
                  </div>
                )}
                {project.channelType && (
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/20 font-mono">Тип и скорость канала</label>
                    <p className="text-sm">{project.channelType} / {project.channelSpeed}</p>
                  </div>
                )}
                {(project.endPoint1 || project.endPoint2) && (
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/20 font-mono">Точки окончания</label>
                    <p className="text-xs text-white/60">№1: {project.endPoint1 || '—'}</p>
                    <p className="text-xs text-white/60">№2: {project.endPoint2 || '—'}</p>
                  </div>
                )}
                {project.orderLifespan && (
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/20 font-mono">Срок заказа</label>
                    <p className="text-sm">{project.orderLifespan}</p>
                  </div>
                )}
                {project.partnerCost !== undefined && !project.isSurvey && (
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/20 font-mono">Расчетные затраты</label>
                    <p className="text-xs text-white/60">Партнер: {project.partnerCost} ₽</p>
                    <p className="text-xs text-white/60">Техотдел: {project.techDeptCost} ₽</p>
                  </div>
                )}
              </div>
            </div>
            {project.additionalInfo && (
              <div className="mt-6 pt-6 border-t border-white/5">
                <label className="text-[10px] uppercase tracking-widest text-white/20 font-mono">Дополнительная информация</label>
                <p className="text-sm text-white/60 mt-1">{project.additionalInfo}</p>
              </div>
            )}
          </section>

          {/* Survey Data Block */}
          {!project.isSurvey && surveyProject && (
            <section className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold italic uppercase tracking-wider flex items-center gap-2">
                  <Search size={20} className="text-yellow-400" /> Данные обследования
                </h3>
                <StageBadge stage={surveyProject.stage} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/20 font-mono">Стоимость техотдела</label>
                    <p className="text-xl font-bold">{surveyProject.techDeptCost || 0} ₽</p>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/20 font-mono">Ответственный инженер</label>
                    <p className="text-sm">
                      {employees.find(e => e.id === surveyProject.responsibleEmployeeId)?.firstName} {employees.find(e => e.id === surveyProject.responsibleEmployeeId)?.lastName}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/20 font-mono">Необходимое оборудование</label>
                    <p className="text-sm text-white/60 whitespace-pre-wrap">{surveyProject.requiredEquipment || 'Не указано'}</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Workflow Actions */}
          <section className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-6">
            <h3 className="text-lg font-bold italic uppercase tracking-wider">Действия по проекту</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {project.stage === 'REQUEST_RECEIVED' && (profile.role === 'COMMERCIAL_DIRECTOR' || profile.role === 'PM') && (
                <div className="col-span-full space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 block">Выберите Проджект-менеджера</label>
                  <select 
                    className="w-full bg-white/5 border border-white/10 p-2 rounded text-sm [&>option]:bg-[#111] [&>option]:text-white"
                    onChange={e => setSelectedResponsible(e.target.value)}
                  >
                    <option value="">Выберите сотрудника</option>
                    {employees.filter(e => e.role === 'PM').map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                  </select>
                  <ActionButton 
                    label="Назначить Проджекта" 
                    description="Отправить проект менеджеру на проработку"
                    onClick={() => {
                      if (!selectedResponsible) {
                        alert('Пожалуйста, выберите Проджект-менеджера');
                        return;
                      }
                      onUpdate('ASSIGNED_TO_PM', { responsibleEmployeeId: selectedResponsible });
                    }}
                  />
                </div>
              )}

              {project.stage === 'ASSIGNED_TO_PM' && (profile.role === 'PM' || profile.role === 'COMMERCIAL_DIRECTOR') && (
                <div className="col-span-full space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 block">Выберите Технического специалиста</label>
                  <select 
                    className="w-full bg-white/5 border border-white/10 p-2 rounded text-sm [&>option]:bg-[#111] [&>option]:text-white"
                    onChange={e => setSelectedResponsible(e.target.value)}
                  >
                    <option value="">Выберите сотрудника</option>
                    {employees.filter(e => e.role === 'TECH_DEPT').map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                  </select>
                  <ActionButton 
                    label="Начать расчет" 
                    description="Запросить стоимость у партнеров и техотдела"
                    onClick={() => {
                      if (!selectedResponsible) {
                        alert('Пожалуйста, выберите Технического специалиста');
                        return;
                      }
                      onUpdate('COSTING_IN_PROGRESS', { techSpecialistId: selectedResponsible });
                    }}
                  />
                </div>
              )}

              {project.stage === 'COSTING_IN_PROGRESS' && (
                <div className="col-span-full space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
                  {project.isSurvey ? (
                    <>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Стоимость техотдела (₽)</label>
                          <input type="number" placeholder="0" className="w-full bg-white/5 border border-white/10 p-2 rounded" id="tCost" defaultValue={project.techDeptCost} />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Необходимое оборудование</label>
                          <textarea placeholder="Список оборудования..." className="w-full bg-white/5 border border-white/10 p-2 rounded min-h-[80px]" id="reqEquip" defaultValue={project.requiredEquipment} />
                        </div>
                      </div>
                      <ActionButton 
                        label="Завершить тех. проект" 
                        description="Передать данные Проджект-менеджеру"
                        onClick={() => {
                          const t = (document.getElementById('tCost') as HTMLInputElement).value;
                          const e = (document.getElementById('reqEquip') as HTMLTextAreaElement).value;
                          onUpdate('CP_PREPARATION', { techDeptCost: Number(t), requiredEquipment: e });
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Стоимость партнера (₽)</label>
                          <input type="number" placeholder="0" className="w-full bg-white/5 border border-white/10 p-2 rounded" id="pCost" defaultValue={project.partnerCost} />
                        </div>
                      </div>
                      <p className="text-xs text-white/40 italic">Ожидание данных от технического отдела (Технический проект)...</p>
                      <ActionButton 
                        label="Подготовить КП" 
                        description="Перейти к подготовке коммерческого предложения"
                        onClick={() => {
                          const p = (document.getElementById('pCost') as HTMLInputElement).value;
                          onUpdate('CP_PREPARATION', { partnerCost: Number(p) });
                        }}
                      />
                    </>
                  )}
                </div>
              )}

              {project.stage === 'CP_PREPARATION' && (profile.role === 'PM' || profile.role === 'COMMERCIAL_DIRECTOR') && (
                <ActionButton 
                  label="Отправить Коммерческому директору" 
                  description={!project.isSurvey && !project.techDeptCost ? "Ожидание данных обследования..." : "КП готово для отправки клиенту"}
                  disabled={!project.isSurvey && !project.techDeptCost}
                  onClick={() => onUpdate('SENDING_CP')}
                />
              )}

              {project.stage === 'SENDING_CP' && (profile.role === 'COMMERCIAL_DIRECTOR') && (
                <ActionButton 
                  label="Отправить КП клиенту" 
                  description="Коммерческое предложение отправлено"
                  onClick={() => onUpdate('CP_SENT', { responsibleEmployeeId: profile.id })}
                />
              )}

              {project.stage === 'CP_SENT' && (profile.role === 'PM' || profile.role === 'COMMERCIAL_DIRECTOR') && (
                <div className="col-span-full flex gap-4">
                  <ActionButton 
                    label="Подготовить договор" 
                    description="Перейти к стадии подписания договора"
                    onClick={() => {
                      // PM becomes responsible
                      const pm = employees.find(e => e.role === 'PM' && e.id === project.responsibleEmployeeId) || employees.find(e => e.role === 'PM');
                      onUpdate('CONTRACTING', { responsibleEmployeeId: pm?.id || project.responsibleEmployeeId });
                    }}
                    className="flex-1"
                  />
                  <ActionButton 
                    label="Сделка провалена" 
                    description="Закрыть проект как проигранный"
                    onClick={() => onUpdate('FAILED')}
                    className="flex-1 bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                  />
                </div>
              )}

              {project.stage === 'CONTRACTING' && (profile.role === 'COMMERCIAL_DIRECTOR' || profile.role === 'PM') && (
                <div className="col-span-full space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 block">Выберите Технического специалиста</label>
                  <select 
                    className="w-full bg-white/5 border border-white/10 p-2 rounded text-sm [&>option]:bg-[#111] [&>option]:text-white"
                    onChange={e => setSelectedResponsible(e.target.value)}
                  >
                    <option value="">Выберите сотрудника</option>
                    {employees.filter(e => e.role === 'TECH_DEPT').map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                  </select>
                  <ActionButton 
                    label="Начать подключение" 
                    description="Передать в техотдел для монтажа"
                    onClick={() => {
                      if (!selectedResponsible) {
                        alert('Пожалуйста, выберите Технического специалиста');
                        return;
                      }
                      onUpdate('IMPLEMENTATION', { responsibleEmployeeId: selectedResponsible });
                    }}
                  />
                </div>
              )}

              {project.stage === 'IMPLEMENTATION' && (
                <div className="col-span-full space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
                  {project.isSurvey ? (
                    profile.role === 'TECH_DEPT' || profile.role === 'COMMERCIAL_DIRECTOR' ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <input type="text" placeholder="MAC адрес" className="bg-white/5 border border-white/10 p-2 rounded text-sm" id="mac" defaultValue={project.macAddress} />
                          <input type="text" placeholder="Скорость порта" className="bg-white/5 border border-white/10 p-2 rounded text-sm" id="speed" defaultValue={project.portSpeed} />
                        </div>
                        <textarea placeholder="Дополнительная информация по отчету..." className="w-full bg-white/5 border border-white/10 p-2 rounded text-sm min-h-[80px]" id="techReport" defaultValue={project.techReportText} />
                        <ActionButton 
                          label="Завершить подключение" 
                          description="Сформировать отчет и передать данные в основной проект"
                          onClick={() => {
                            const m = (document.getElementById('mac') as HTMLInputElement).value;
                            const s = (document.getElementById('speed') as HTMLInputElement).value;
                            const r = (document.getElementById('techReport') as HTMLTextAreaElement).value;
                            onUpdate('CONNECTED', { macAddress: m, portSpeed: s, techReportText: r });
                          }}
                        />
                      </>
                    ) : (
                      <p className="text-xs text-white/40 italic">Ожидание отчета от технического специалиста...</p>
                    )
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                        <Clock size={16} /> Подключение в процессе
                      </p>
                      <p className="text-xs text-white/40">Технический специалист выполняет работы и заполняет отчет в техническом проекте.</p>
                    </div>
                  )}
                </div>
              )}

              {project.stage === 'INVOICING' && (profile.role === 'PM' || profile.role === 'COMMERCIAL_DIRECTOR') && (
                <ActionButton 
                  label="Выставить счета и акты" 
                  description="Документы подготовлены и отправлены клиенту"
                  onClick={() => onUpdate('PAYMENT_CONTROL')}
                  className="col-span-full"
                />
              )}

              {project.stage === 'PAYMENT_CONTROL' && (profile.role === 'PM' || profile.role === 'COMMERCIAL_DIRECTOR') && (
                <ActionButton 
                  label="Оплата получена" 
                  description="Завершить сделку"
                  onClick={() => onUpdate('COMPLETED')}
                  className="col-span-full bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
                />
              )}
            </div>
          </section>
        </div>

        {/* Chat / Activity Sidebar */}
        <div className="w-full lg:w-96 space-y-6">
          <section className="bg-white/5 border border-white/10 rounded-2xl flex flex-col h-[600px]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2"><MessageSquare size={16} /> Чат проекта</h3>
              <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">{messages.length} Сообщений</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => {
                const sender = employees.find(e => e.id === msg.senderId);
                const isMe = msg.senderId === profile.id;
                return (
                  <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                    <div className={cn(
                      "max-w-[80%] p-3 rounded-2xl text-sm",
                      isMe ? "bg-white text-black rounded-tr-none" : "bg-white/10 text-white rounded-tl-none"
                    )}>
                      {msg.text}
                    </div>
                    <p className="text-[10px] text-white/20 mt-1">
                      {sender?.firstName} • {msg.createdAt ? format(msg.createdAt.toDate(), 'HH:mm') : 'сейчас'}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-white/10 flex gap-2">
              <input 
                type="text" 
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Написать сообщение..." 
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/20"
              />
              <button onClick={sendMessage} className="p-2 bg-white text-black rounded-lg hover:bg-white/90 transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
          </section>

          <section className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold flex items-center gap-2"><Camera size={16} /> Отчет по проекту</h3>
            
            {(project.macAddress || project.portSpeed || project.techReportText) && (
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
                {project.macAddress && (
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/20 font-mono">MAC Адрес</label>
                    <p className="text-sm font-mono">{project.macAddress}</p>
                  </div>
                )}
                {project.portSpeed && (
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/20 font-mono">Скорость порта</label>
                    <p className="text-sm">{project.portSpeed}</p>
                  </div>
                )}
                {project.techReportText && (
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/20 font-mono">Дополнительно</label>
                    <p className="text-sm text-white/60">{project.techReportText}</p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              {photoPreview.map((p, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden border border-white/10">
                  <img src={p} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              ))}
              <label className="aspect-square bg-white/5 rounded-lg flex flex-col items-center justify-center text-white/20 border border-white/10 border-dashed cursor-pointer hover:bg-white/10 transition-all">
                <Plus size={20} />
                <span className="text-[8px] uppercase mt-1">Добавить фото</span>
                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </label>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}

function CompanyDetails({ company, onBack, projects, contacts, employees, profile, setLastError, setShowModal, setEditingEntity, setFormData, handleDelete }: {
  company: Company,
  onBack: () => void,
  projects: Project[],
  contacts: ContactPerson[],
  employees: Employee[],
  profile: Employee,
  setLastError: (err: FirestoreErrorInfo | null) => void,
  setShowModal: (val: any) => void,
  setEditingEntity: (val: any) => void,
  setFormData: (val: any) => void,
  handleDelete: (collection: string, id: string, title?: string) => void
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'messages'), where('targetId', '==', company.id), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
    }, (error) => setLastError(handleFirestoreError(error, OperationType.LIST, 'messages')));
  }, [company.id]);

  const sendMessage = async () => {
    if (!newMsg.trim()) return;
    try {
      await addDoc(collection(db, 'messages'), {
        targetId: company.id,
        senderId: profile.id,
        text: newMsg,
        createdAt: Timestamp.now()
      });
      setNewMsg('');
    } catch (error) {
      setLastError(handleFirestoreError(error, OperationType.CREATE, 'messages'));
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm font-medium">
        <ArrowRight size={16} className="rotate-180" /> Назад к компаниям
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <h2 className="text-3xl font-bold">{company.shortName}</h2>
            <p className="text-white/40 mt-1">{company.legalName}</p>
            <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
              <div><span className="text-white/20 uppercase text-[10px] block">ИНН</span> {company.inn}</div>
              <div><span className="text-white/20 uppercase text-[10px] block">КПП</span> {company.kpp || '—'}</div>
              <div className="col-span-2"><span className="text-white/20 uppercase text-[10px] block">Адрес</span> {company.actualAddress}</div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold italic uppercase tracking-wider">Основные проекты</h3>
              <button 
                onClick={() => { setEditingEntity(null); setFormData({ companyId: company.id }); setShowModal('project'); }}
                className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {projects.filter(p => !p.isSurvey).map(p => (
                <div 
                  key={p.id} 
                  onClick={() => {
                    (window as any).selectProject(p);
                  }}
                  className="bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between items-center hover:bg-white/10 transition-all cursor-pointer group"
                >
                  <div>
                    <p className="font-bold group-hover:text-white transition-colors">{p.name}</p>
                    <p className="text-xs text-white/40">{p.createdAt ? format(p.createdAt.toDate(), 'PPP') : 'Недавно'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <StageBadge stage={p.stage} />
                    <ChevronRight size={16} className="text-white/20 group-hover:text-white transition-colors" />
                  </div>
                </div>
              ))}
              {projects.filter(p => !p.isSurvey).length === 0 && (
                <p className="text-sm text-white/20 italic">У этой компании пока нет основных проектов</p>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-bold italic uppercase tracking-wider">Проекты обследования</h3>
            <div className="grid grid-cols-1 gap-4">
              {projects.filter(p => p.isSurvey).map(p => (
                <div 
                  key={p.id} 
                  onClick={() => {
                    (window as any).selectProject(p);
                  }}
                  className="bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between items-center hover:bg-white/10 transition-all cursor-pointer group"
                >
                  <div>
                    <p className="font-bold group-hover:text-white transition-colors">{p.name}</p>
                    <p className="text-xs text-white/40">{p.createdAt ? format(p.createdAt.toDate(), 'PPP') : 'Недавно'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <StageBadge stage={p.stage} />
                    <ChevronRight size={16} className="text-white/20 group-hover:text-white transition-colors" />
                  </div>
                </div>
              ))}
              {projects.filter(p => p.isSurvey).length === 0 && (
                <p className="text-sm text-white/20 italic">У этой компании пока нет проектов обследования</p>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold italic uppercase tracking-wider">Контактные лица</h3>
              <button 
                onClick={() => { setEditingEntity(null); setFormData({ companyIds: [company.id] }); setShowModal('contact'); }}
                className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {contacts.map(c => (
                <div key={c.id} className="bg-white/5 border border-white/10 p-4 rounded-xl group">
                  <div className="flex items-start justify-between mb-2">
                    <div className="shrink-0">
                      <p className="font-bold">{c.firstName} {c.lastName}</p>
                      <p className="text-xs text-white/40">{c.position}</p>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingEntity(c); setFormData(c); setShowModal('contact'); }}
                        className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-all"
                        title="Изменить"
                      >
                        <Settings size={12} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete('contactPersons', c.id, `контакт "${c.firstName} ${c.lastName}"`); }}
                        className="p-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-all"
                        title="Удалить"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-white/60">{c.phone}</p>
                </div>
              ))}
              {contacts.length === 0 && (
                <p className="text-sm text-white/20 italic">У этой компании пока нет контактов</p>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-white/5 border border-white/10 rounded-2xl flex flex-col h-[600px]">
            <div className="p-4 border-b border-white/10">
              <h3 className="font-bold flex items-center gap-2"><MessageSquare size={16} /> Чат компании</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => {
                const sender = employees.find(e => e.id === msg.senderId);
                const isMe = msg.senderId === profile.id;
                return (
                  <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                    <div className={cn("max-w-[80%] p-3 rounded-2xl text-sm", isMe ? "bg-white text-black rounded-tr-none" : "bg-white/10 text-white rounded-tl-none")}>
                      {msg.text}
                    </div>
                    <p className="text-[10px] text-white/20 mt-1">{sender?.firstName} • {msg.createdAt ? format(msg.createdAt.toDate(), 'HH:mm') : 'сейчас'}</p>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-white/10 flex gap-2">
              <input type="text" value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Написать..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/20" />
              <button onClick={sendMessage} className="p-2 bg-white text-black rounded-lg hover:bg-white/90 transition-colors"><ChevronRight size={20} /></button>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}

function ActionButton({ label, description, onClick, className, disabled }: { label: string, description: string, onClick: () => void, className?: string, disabled?: boolean }) {
  return (
    <button 
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "text-left p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group",
        disabled && "opacity-50 cursor-not-allowed grayscale",
        className
      )}
    >
      <p className="font-bold text-sm group-hover:translate-x-1 transition-transform">{label}</p>
      <p className="text-[10px] text-white/40 mt-1 leading-tight">{description}</p>
    </button>
  );
}
