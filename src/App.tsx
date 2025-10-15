import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Poltronas from "./pages/Poltronas";
import Pagamentos from "./pages/Pagamentos";
import Relatorios from "./pages/Relatorios";
import Logs from "./pages/Logs";
import Configuracoes from "./pages/Configuracoes";
import Auditoria from "./pages/Auditoria";
import Manutencao from "./pages/Manutencao";
import NotFound from "./pages/NotFound";
import PublicPayment from "./pages/PublicPayment";

const queryClient = new QueryClient();

const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <SidebarProvider>
    <div className="page-container flex w-full h-screen">
      <AppSidebar />
      <div className="flex-1 flex flex-col main-content">
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-6 shadow-sm">
          <SidebarTrigger className="hover:bg-accent rounded-md p-2 transition-colors" />
          <div className="ml-auto">
            <div className="text-sm text-muted-foreground">
              Sistema de Poltronas Relax
            </div>
          </div>
        </header>
        <main className="content-wrapper p-6 bg-gradient-to-br from-background to-muted/20">
          {children}
        </main>
      </div>
    </div>
  </SidebarProvider>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/pay/:poltronaId" element={<PublicPayment />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/poltronas"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Poltronas />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pagamentos"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Pagamentos />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/relatorios"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Relatorios />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/logs"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Logs />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/configuracoes"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Configuracoes />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/auditoria"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Auditoria />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/manutencao"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Manutencao />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
