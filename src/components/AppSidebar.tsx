import { Home, Armchair, CreditCard, BarChart3, FileText, LogOut } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Poltronas", url: "/poltronas", icon: Armchair },
  { title: "Pagamentos", url: "/pagamentos", icon: CreditCard },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "Logs", url: "/logs", icon: FileText },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Logout realizado com sucesso!");
      navigate("/login");
    } catch (error: any) {
      toast.error("Erro ao fazer logout");
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="px-4 py-6 flex items-center gap-3">
          <div className="text-3xl">💆‍♂️</div>
          {state !== "collapsed" && (
            <div>
              <h2 className="font-bold text-lg">Poltrona Relax</h2>
              <p className="text-xs text-muted-foreground">Admin</p>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-sidebar-accent"
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout}>
                  <LogOut className="h-5 w-5" />
                  <span>Sair</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
