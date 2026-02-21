import { useState, useEffect } from 'react';
import { Shield, Crown, UserCog, User, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { hasRootControls, canChangeRole, getAssignableRoles, isRootAccount } from '@/utils/rootUtils';
import { AppRole } from '@/utils/rbacUtils';

interface RoleManagementProps {
  targetUserId: string;
  targetUsername?: string;
  onRoleChanged?: () => void;
}

const ROLE_CONFIG: Record<AppRole, { label: string; icon: React.ElementType; color: string }> = {
  super_admin: { label: 'Super Admin', icon: Crown, color: 'text-amber-500' },
  admin: { label: 'Admin', icon: Shield, color: 'text-red-500' },
  moderator: { label: 'Moderator', icon: UserCog, color: 'text-blue-500' },
  user: { label: 'User', icon: User, color: 'text-muted-foreground' },
};

export const RoleManagement = ({ targetUserId, targetUsername, onRoleChanged }: RoleManagementProps) => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [currentRole, setCurrentRole] = useState<AppRole>('user');
  const [selectedRole, setSelectedRole] = useState<AppRole>('user');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Permission checks
  const isActorRoot = hasRootControls(user?.id);
  const isTargetRoot = isRootAccount(targetUserId);
  const canManage = canChangeRole(user?.id, userRole, targetUserId, currentRole);
  const assignableRoles = getAssignableRoles(user?.id, userRole);

  useEffect(() => {
    fetchCurrentRole();
  }, [targetUserId]);

  const fetchCurrentRole = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', targetUserId)
      .maybeSingle();

    const role = (data?.role as AppRole) || 'user';
    setCurrentRole(role);
    setSelectedRole(role);
    setLoading(false);
  };

  const handleRoleChange = async () => {
    if (!user?.id || selectedRole === currentRole) return;

    // Double-check permissions
    if (!canChangeRole(user.id, userRole, targetUserId, currentRole)) {
      toast({ 
        title: 'წვდომა აკრძალულია', 
        variant: 'destructive' 
      });
      return;
    }

    // Check if trying to assign super_admin without root controls
    if (selectedRole === 'super_admin' && !hasRootControls(user.id)) {
      toast({ 
        title: 'წვდომა აკრძალულია', 
        description: 'Super Admin როლის მინიჭება შეუძლებელია',
        variant: 'destructive' 
      });
      return;
    }

    setSaving(true);
    try {
      if (selectedRole === 'user') {
        // Remove role entry
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', targetUserId);
      } else {
        // Upsert role
        const { error } = await supabase
          .from('user_roles')
          .upsert({
            user_id: targetUserId,
            role: selectedRole
          }, {
            onConflict: 'user_id'
          });

        if (error) throw error;
      }

      // Log the action
      await supabase.from('admin_action_logs').insert({
        admin_id: user.id,
        admin_role: userRole || 'user',
        action_type: 'role_change',
        action_category: 'user_management',
        target_user_id: targetUserId,
        description: `როლი შეიცვალა: ${currentRole} → ${selectedRole}`,
        metadata: {
          old_role: currentRole,
          new_role: selectedRole,
          target_username: targetUsername
        }
      });

      setCurrentRole(selectedRole);
      toast({ 
        title: 'როლი შეიცვალა', 
        description: `${targetUsername || 'მომხმარებელს'} მიენიჭა ${ROLE_CONFIG[selectedRole].label}`
      });
      onRoleChanged?.();
    } catch (error) {
      console.error('Error changing role:', error);
      toast({ 
        title: 'შეცდომა', 
        description: 'როლის შეცვლა ვერ მოხერხდა',
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  // Don't render if user cannot manage roles
  if (!canManage && !loading) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const CurrentIcon = ROLE_CONFIG[currentRole].icon;

  return (
    <div className="p-4 rounded-xl bg-card border border-border space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-primary" />
        <span className="font-medium">როლის მართვა</span>
        {isActorRoot && (
          <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full">
            Root Controls
          </span>
        )}
      </div>

      {/* Current Role Display */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">მიმდინარე:</span>
        <div className={`flex items-center gap-1 ${ROLE_CONFIG[currentRole].color}`}>
          <CurrentIcon className="w-4 h-4" />
          <span className="font-medium">{ROLE_CONFIG[currentRole].label}</span>
        </div>
      </div>

      {/* Protected Account Warning */}
      {isTargetRoot && !isActorRoot && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500 text-sm">
          ეს ანგარიში დაცულია და მისი როლის შეცვლა შეუძლებელია
        </div>
      )}

      {/* Role Selection */}
      {canManage && (
        <div className="space-y-3">
          <Label>ახალი როლი</Label>
          <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {assignableRoles.map((role) => {
                const config = ROLE_CONFIG[role as AppRole];
                const Icon = config.icon;
                return (
                  <SelectItem key={role} value={role}>
                    <div className={`flex items-center gap-2 ${config.color}`}>
                      <Icon className="w-4 h-4" />
                      <span>{config.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Button
            onClick={handleRoleChange}
            disabled={saving || selectedRole === currentRole}
            className="w-full"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            როლის შეცვლა
          </Button>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;
