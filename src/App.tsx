// src/App.tsx
import { Routes, Route } from 'react-router-dom';
import Signup from './pages/Signup.tsx'; 
import Login from './pages/Login.tsx';
import Dashboard from './pages/Dashboard.tsx'; 
import ProtectedRoute from './components/ProtectedRoute.tsx';
import AuthRoute from './components/AuthRoute.tsx'; 
import Navbar from './components/Navbar.tsx';
import RoleManager from './pages/RoleManager.tsx';
import WorkflowManager from './pages/WorkflowManager.tsx';
import DocumentUpload from './pages/DocumentUpload.tsx';
import DocumentApproval from './pages/DocumentApproval.tsx';
import DocumentList from './pages/DocumentList.tsx';
import DocumentDetail from './pages/DocumentDetail.tsx';
import NewDof from './pages/NewDof.tsx';
import DofList from './pages/DofList.tsx';
import DofDetail from './pages/DofDetail.tsx';
import NewAudit from './pages/NewAudit.tsx';
import AuditList from './pages/AuditList.tsx';
import AuditDetail from './pages/AuditDetail.tsx';
import NewComplaint from './pages/NewComplaint.tsx';
import ComplaintList from './pages/ComplaintList.tsx';
import ComplaintDetail from './pages/ComplaintDetail.tsx';
import NewDevice from './pages/NewDevice.tsx';


// 1. YENİ: Mantine'in v7 iskelet bileşenlerini import et
import { AppShell } from '@mantine/core';

function App() {
  return (
    // 2. YENİ: Tüm uygulamayı 'AppShell' ile sar
    <AppShell
      padding="md"
      // 3. YENİ: Navbar bileşenimizi 'header' prop'una atayarak
      // 'Header' hatasını çözüyoruz.
      header={{ height: 60 }}
    >
      {/* Üst Başlık (Header) Alanı */}
      {/* withBorder prop'u alta ince bir çizgi ekler. p="md" ise iç boşluk verir. */}
<AppShell.Header withBorder p="md">
  <Navbar />
</AppShell.Header>

      {/* Ana İçerik Alanı (Rotalar) */}
      <AppShell.Main>
        <Routes>
          {/* Ana Sayfa */}
          <Route 
            path="/" 
            element={ <ProtectedRoute> <Dashboard /> </ProtectedRoute> } 
          />
          
          {/* Giriş / Kayıt Rotaları */}
          <Route 
            path="/login" 
            element={ <AuthRoute> <Login /> </AuthRoute> } 
          /> 
          <Route 
            path="/signup" 
            element={ <AuthRoute> <Signup /> </AuthRoute> } 
          /> 

          {/* ADMIN ROTALARI */}
          <Route 
            path="/admin/roles" 
            element={ <ProtectedRoute> <RoleManager /> </ProtectedRoute> }
          />
          <Route 
            path="/admin/workflows" 
            element={ <ProtectedRoute> <WorkflowManager /> </ProtectedRoute> }
          />

          {/* DMS ROTALARI */}
          <Route 
            path="/documents/new" 
            element={ <ProtectedRoute> <DocumentUpload /> </ProtectedRoute> }
          />
          <Route 
            path="/documents" 
            element={ <ProtectedRoute> <DocumentList /> </ProtectedRoute> }
          />
          <Route 
            path="/doc/:docId" 
            element={ <ProtectedRoute> <DocumentDetail /> </ProtectedRoute> }
          />

          {/* DÖF ROTALARI */}
          <Route 
            path="/dof/new" 
            element={ <ProtectedRoute> <NewDof /> </ProtectedRoute> }
          />

          <Route 
            path="/dofs" 
            element={ <ProtectedRoute> <DofList /> </ProtectedRoute> }
          />

          <Route 
            path="/dof/:dofId" 
            element={<ProtectedRoute><DofDetail /></ProtectedRoute>} 
          />


          {/* GÖREV ROTASI */}
          <Route 
            path="/task/approve/:taskId" 
            element={ <ProtectedRoute> <DocumentApproval /> </ProtectedRoute> }
          />

          {/* DENETİM ROTALARI */}
          <Route 
           path="/audit/new" 
           element={ <ProtectedRoute> <NewAudit /> </ProtectedRoute> }
          />

          <Route 
           path="/audits" 
           element={ <ProtectedRoute> <AuditList /> </ProtectedRoute> } 
           />

           <Route 
            path="/audit/:auditId" 
            element={ <ProtectedRoute> <AuditDetail /> </ProtectedRoute> } 
            />

             {/* MÜŞTERİ ŞİKAYETLERİ ROTALARI */}
           <Route 
            path="/complaint/new" 
            element={ <ProtectedRoute> <NewComplaint /> </ProtectedRoute> }
            />

            <Route 
             path="/complaints" 
             element={ <ProtectedRoute> <ComplaintList /> </ProtectedRoute> }
            />

            <Route 
             path="/complaint/:complaintId" 
             element={ <ProtectedRoute> <ComplaintDetail /> </ProtectedRoute> } 
             />

             {/* EKİPMAN ROTALARI */}
            <Route 
              path="/device/new" 
              element={ <ProtectedRoute> <NewDevice /> </ProtectedRoute> }
            />




        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;