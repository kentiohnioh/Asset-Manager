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
    { label: "Products", href: "/products", icon: Package },
    { label: "Suppliers", href: "/suppliers", icon: Truck },
    { label: "Stock In", href: "/stock-in", icon: ArrowDownToLine },
    { label: "Stock Out", href: "/stock-out", icon: ArrowUpFromLine },
    { label: "Reports", href: "/reports", icon: BarChart3 },
  ];

  if (user?.role === "admin") {
    navItems.push({ label: "Users", href: "/users", icon: Users });
  }

  return (
    <SidebarContainer className="border-r border-border">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="font-display font-bold text-xl tracking-tight">InventPro</h1>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-2">
              {navItems.map((item) => (
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
