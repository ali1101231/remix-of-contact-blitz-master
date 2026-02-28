
import React, { useState } from "react";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel
} from "@/components/ui/sidebar";
import { 
  Building, 
  FileText, 
  Split, 
  Filter, 
  Globe, 
  Briefcase, 
  User, 
  Mail, 
  Search, 
  Copy, 
  Database,
  Check,
  Settings,
  Layers,
  Zap,
  List,
  Shield,
  Wrench,
  FilterX,
  Link2Off,
  MapPin,
  MessageSquare,
  FileSpreadsheet,
  Brain,
  UserPlus,
  AtSign
} from "lucide-react";

interface MenuItemProps {
  icon: React.ElementType;
  title: string;
  active: boolean;
  onClick: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon: Icon, title, active, onClick }) => (
  <SidebarMenuItem>
    <SidebarMenuButton isActive={active} onClick={onClick}>
      <Icon className="mr-2 h-4 w-4" />
      <span>{title}</span>
    </SidebarMenuButton>
  </SidebarMenuItem>
);

interface CategoryProps {
  title: string;
  icon: React.ElementType;
  items: { id: string; title: string; icon: React.ElementType }[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Category: React.FC<CategoryProps> = ({ title, icon: Icon, items, activeTab, onTabChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const toggleCategory = () => {
    setIsOpen(!isOpen);
  };
  
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="cursor-pointer" onClick={toggleCategory}>
        <Icon className="mr-2 h-4 w-4" />
        {title}
      </SidebarGroupLabel>
      
      {isOpen && (
        <SidebarMenu className="ml-4">
          {items.map((item) => (
            <MenuItem
              key={item.id}
              icon={item.icon}
              title={item.title}
              active={activeTab === item.id}
              onClick={() => onTabChange(item.id)}
            />
          ))}
        </SidebarMenu>
      )}
    </SidebarGroup>
  );
};

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const AppSidebar: React.FC<AppSidebarProps> = ({ activeTab, onTabChange }) => {
  const categories = [
    {
      id: "basics",
      title: "Basics",
      icon: FileText,
      items: [
        { id: "upload", title: "Upload CSV", icon: FileText },
        { id: "process", title: "Process Files", icon: Settings }
      ]
    },
    {
      id: "fixers",
      title: "Fixers",
      icon: Wrench,
      items: [
        { id: "company-name-fixer", title: "Company Name Fixer", icon: Building },
        { id: "job-title", title: "Job Title Normalizer", icon: User },
        { id: "job-title-cleaner", title: "Job Title Cleaner", icon: Wrench },
        { id: "full-name-breaker", title: "Full Name Breaker", icon: UserPlus },
        { id: "company-puller", title: "CompanyName Puller From Emails", icon: AtSign }
      ]
    },
    {
      id: "organizers",
      title: "Organizers",
      icon: Layers,
      items: [
        { id: "merge-clean", title: "Merge And Clean", icon: Database },
        { id: "segmentation", title: "Segmentation", icon: Filter },
        { id: "splitter", title: "Splitter", icon: Split }
      ]
    },
    {
      id: "scrapers",
      title: "Scrapers",
      icon: Search,
      items: [
        { id: "website-scraper", title: "Website Scraper", icon: Globe }
      ]
    },
    {
      id: "analyzers",
      title: "Analyzers",
      icon: Zap,
      items: [
        { id: "company-type", title: "Company Type Finder", icon: Briefcase },
        { id: "esp-finder", title: "ESP Finder", icon: Mail },
        { id: "duplicate-catcher", title: "Duplicate Catcher", icon: Copy },
        { id: "decision-maker", title: "Decision Maker Prioritizer", icon: Shield },
        { id: "list-health", title: "List Health Checker", icon: List },
        { id: "mx-checker", title: "MX Record Checker", icon: Search }
      ]
    },
    {
      id: "assistant",
      title: "Assistant",
      icon: Brain,
      items: [
        { id: "ai-assistant", title: "AI Sheet Processor", icon: FileSpreadsheet }
      ]
    },
    {
      id: "cleaners",
      title: "Cleaners",
      icon: FilterX,
      items: [
        { id: "email-sanitizer", title: "Email Sanitizer", icon: Check },
        { id: "email-remover", title: "Free Email Remover", icon: Link2Off }
      ]
    },
    {
      id: "generators",
      title: "Generators",
      icon: Mail,
      items: [
        { id: "email-variation", title: "Email Variation Generator", icon: Mail }
      ]
    },
    {
      id: "location",
      title: "Location Tools",
      icon: MapPin,
      items: [
        { id: "country-extractor", title: "Country & Region Extractor", icon: MapPin }
      ]
    }
  ];

  return (
    <Sidebar>
      <SidebarHeader className="flex items-center">
        <h2 className="text-xl font-bold px-4 py-2">ContactBlitz</h2>
        <div className="ml-auto">
          <SidebarTrigger />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {categories.map((category) => (
          <Category
            key={category.id}
            title={category.title}
            icon={category.icon}
            items={category.items}
            activeTab={activeTab}
            onTabChange={onTabChange}
          />
        ))}
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
