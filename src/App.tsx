// src/App.tsx
import { Routes, Route } from 'react-router-dom';
import Signup from "./pages/auth/Signup";
import Login from "./pages/auth/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import ProtectedRoute from './components/ProtectedRoute.tsx';
import AuthRoute from './components/AuthRoute.tsx'; 
import Navbar from './components/Navbar.tsx';
import RoleManager from './pages/admin/RoleManager.tsx';
import WorkflowManager from './pages/admin/WorkflowManager.tsx';
import DocumentUpload from './pages/documents/DocumentUpload.tsx';
import DocumentApproval from './pages/documents/DocumentApproval.tsx';
import DocumentList from './pages/documents/DocumentList.tsx';
import DocumentDetail from './pages/documents/DocumentDetail.tsx';
import NewDof from './pages/dof/NewDof.tsx';
import DofList from './pages/dof/DofList.tsx';
import DofDetail from './pages/dof/DofDetail.tsx';
import NewAudit from './pages/audits/NewAudit.tsx';
import AuditList from './pages/audits/AuditList.tsx';
import AuditDetail from './pages/audits/AuditDetail.tsx';
import NewComplaint from './pages/complaints/NewComplaint.tsx';
import ComplaintList from './pages/complaints/ComplaintList.tsx';
import ComplaintDetail from './pages/complaints/ComplaintDetail.tsx';
import NewDevice from './pages/devices/NewDevice.tsx';
import DevicesList from "./pages/devices/DevicesList.tsx";
import NewKPI from "./pages/kpi/NewKPI.tsx";
import KPIList from "./pages/kpi/KPIList.tsx";
import NewRisk from "./pages/risks/NewRisk.tsx";
import RiskList from "./pages/risks/RiskList.tsx";
import NewTraining from "./pages/trainings/NewTraining.tsx";
import TrainingList from "./pages/trainings/TrainingList.tsx";
import NewIncident from "./pages/incidents/NewIncident.tsx";
import IncidentList from "./pages/incidents/IncidentList.tsx";




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
            path="/dof/:id"
            element={
          <ProtectedRoute>
          <DofDetail />
         </ProtectedRoute>
            }
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

            <Route 
              path="/devices" 
              element={<DevicesList />} />

            {/* KPI ROTALARI */}
            <Route
  path="/kpi/new"
  element={
    <ProtectedRoute>
      <NewKPI />
    </ProtectedRoute>
  }
/>
<Route
  path="/kpis"
  element={
    <ProtectedRoute>
      <KPIList />
    </ProtectedRoute>
  }
/>

            {/* RİSK YÖNETİMİ ROTALARI */}
             <Route
  path="/risk/new"
  element={
    <ProtectedRoute>
      <NewRisk />
    </ProtectedRoute>
  }
/>
<Route
  path="/risks"
  element={
    <ProtectedRoute>
      <RiskList />
    </ProtectedRoute>
  }
/>
            {/* EĞİTİM YÖNETİMİ ROTALARI */}
            <Route
  path="/training/new"
  element={
    <ProtectedRoute>
      <NewTraining />
    </ProtectedRoute>
  }
/>
<Route
  path="/trainings"
  element={
    <ProtectedRoute>
      <TrainingList />
    </ProtectedRoute>
  }
/>

            {/* OLAY YÖNETİMİ ROTALARI */}
            <Route
  path="/incident/new"
  element={
    <ProtectedRoute>
      <NewIncident />
    </ProtectedRoute>
  }
/>
<Route
  path="/incidents"
  element={
    <ProtectedRoute>
      <IncidentList />
    </ProtectedRoute>
  }
/>






        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;