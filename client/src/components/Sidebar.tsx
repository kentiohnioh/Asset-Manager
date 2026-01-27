import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  Truck,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  LogOut,
  Users,
  Settings
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  Sidebar as SidebarContainer,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Products", href: "/products", icon: Package, roles: ['admin', 'manager', 'viewer'] },
    { label: "Suppliers", href: "/suppliers", icon: Truck, roles: ['admin', 'manager', 'viewer'] },
    { label: "Stock In", href: "/stock-in", icon: ArrowDownToLine, roles: ['admin', 'manager', 'stock_controller'] },
    { label: "Stock Out", href: "/stock-out", icon: ArrowUpFromLine, roles: ['admin', 'manager', 'stock_controller'] },
    { label: "Reports", href: "/reports", icon: BarChart3, roles: ['admin', 'manager', 'viewer'] },
  ];

  const filteredItems = navItems.filter(item => !item.roles || item.roles.includes(user?.role || ''));

  if (user?.role === "admin") {
    filteredItems.push({ label: "Users", href: "/users", icon: Users });
  }

  return (
    <SidebarContainer className="border-r border-border">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2 px-4 py-6">
          <img
            src="/favicon.png"
            alt="ICS"
            className="h-8 w-8 rounded-full"
          />
          <span className="text-xl font-bold">ICS</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-2">
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.href}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/50 bg-muted/20">
        <div className="flex items-center gap-3 px-2 mb-4">
          <Avatar className="h-9 w-9 border border-primary/10">
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {user?.name?.[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold truncate leading-none mb-1">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate capitalize">{user?.role}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => logout()}
          className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </SidebarFooter>
    </SidebarContainer>
  );
}
