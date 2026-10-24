import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  if (!url || !key) return null;
  return createSupabaseJsClient(url, key);
}

export async function GET() {
  try {
    const supabase = getAdminClient() || (await createClient());
    const [
      { data: users, error },
      { data: students },
      { data: teachers },
      { data: admins },
      { data: itStaff },
      { data: sections },
      { data: applications },
    ] = await Promise.all([
      supabase.from("users").select("*").order("created_at", { ascending: false }),
      supabase.from("students").select("*"),
      supabase.from("teachers").select("*"),
      supabase.from("school_administrators").select("*"),
      supabase.from("it_supports").select("*"),
      supabase.from("sections").select("id, section_name, grade_level, strand"),
      supabase
        .from("enrollment_applications")
        .select("id, student_id")
        .order("created_at", { ascending: false }),
    ]);

    if (error) {
      console.error("GET /api/users error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const mappedUsers = (users || []).map((u: any) => {
      const userRole = (u.user_role || u.userRole || "student").toLowerCase();
      const st = (students || []).find(
        (s: any) => s.user_id === u.id || (s.student_id && s.student_id === u.user_id)
      );
      const tc = (teachers || []).find(
        (t: any) =>
          t.user_id === u.id ||
          (u.email && t.email && t.email.toLowerCase() === u.email.toLowerCase()) ||
          (t.teacher_id && t.teacher_id === u.user_id)
      );
      const ad = (admins || []).find(
        (a: any) => a.user_id === u.id || (a.admin_id && a.admin_id === u.user_id)
      );
      const it = (itStaff || []).find(
        (i: any) => i.user_id === u.id || (i.itsupport_id && i.itsupport_id === u.user_id)
      );

      let fullName = "";
      let photoUrl: string | null = null;
      let details: Record<string, any> = {};

      if (st) {
        const parts = [st.first_name, st.middle_name, st.last_name].filter(
          (p) => p && p.trim() && p.toUpperCase() !== "N/A"
        );
        fullName = parts.join(" ") || "Student Learner";
        const section = (sections || []).find((sec: any) => sec.id === st.current_section_id);

        const app = (applications || []).find((a: any) => a.student_id === st.id);
        photoUrl = null;

        details = {
          lrn: st.student_id || "Not assigned",
          gradeLevel: st.grade_level ? `Grade ${st.grade_level}` : "Unassigned",
          strand: st.strand || (st.grade_level && st.grade_level >= 11 ? "Senior High Core" : "Junior High School Core"),
          sectionName: section ? section.section_name : "Unassigned",
          barangay: st.barangay || "N/A",
          gender: st.gender || "Not specified",
          contactNumber: st.contact_number || "None provided",
          dateOfBirth: st.date_of_birth || "Not specified",
        };
      } else if (tc) {
        const parts = [tc.first_name, tc.middle_name, tc.last_name].filter(
          (p) => p && p.trim() && p.toUpperCase() !== "N/A"
        );
        fullName = parts.join(" ") || "Faculty Member";
        details = {
          teacherId: tc.teacher_id || u.user_id,
          department: tc.department || "Faculty Staff",
          facultyEmail: tc.email || u.email,
        };
      } else if (ad) {
        const parts = [ad.first_name, ad.last_name].filter(
          (p) => p && p.trim() && p.toUpperCase() !== "N/A"
        );
        fullName = parts.join(" ") || "School Administrator";
        details = {
          adminId: ad.admin_id || u.user_id,
          department: ad.department || "Academic Affairs",
        };
      } else if (it || (u.email && u.email.toLowerCase() === "dumalnext@gmail.com")) {
        fullName = (it && it.system_role) || "System Administrator";
        details = {
          itsupportId: (it && it.itsupport_id) || u.user_id || "DNHS-IT-001",
          systemRole: (it && it.system_role) || "IT Support Desk",
        };
      } else {
        if (u.email) {
          const localPart = u.email.split("@")[0].replace(/[._]/g, " ");
          fullName = localPart
            .split(" ")
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
        } else {
          fullName = u.user_id || "DNHS User";
        }
      }

      return {
        id: u.id,
        userId: u.user_id || u.userId || (u.email ? u.email.split("@")[0].toUpperCase() : "DNHS-USER"),
        fullName,
        email: u.email || "",
        userRole,
        photoUrl,
        createdAt: u.created_at || u.createdAt || new Date().toISOString(),
        details,
      };
    });

    const counts = {
      all: mappedUsers.length,
      student: mappedUsers.filter((u) => u.userRole === "student").length,
      teacher: mappedUsers.filter((u) => u.userRole === "teacher").length,
      admin: mappedUsers.filter((u) => u.userRole === "admin").length,
      it_support: mappedUsers.filter((u) => u.userRole === "it_support").length,
    };

    return NextResponse.json({ success: true, users: mappedUsers, counts });
  } catch (err: any) {
    console.error("GET /api/users exception:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getAdminClient() || (await createClient());
    const body = await req.json();

    const { userId, email, password, userRole, fullName, department } = body;

    if (!userId || !email || !userRole) {
      return NextResponse.json(
        { error: "User ID, Email, and User Role are required." },
        { status: 400 }
      );
    }

    const cleanUserId = userId.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanRole = userRole.toLowerCase();

    // Check if user already exists by user_id or email
    const { data: existingUsers } = await supabase
      .from("users")
      .select("*")
      .or(`user_id.eq.${cleanUserId},email.eq.${cleanEmail}`)
      .limit(1);

    let userData = existingUsers?.[0] || null;

    if (userData) {
      const existingRole = (userData.user_role || "").toLowerCase();
      if (existingRole && existingRole !== cleanRole) {
        return NextResponse.json(
          {
            error: `Stakeholder Conflict: This account (${cleanEmail}) is already registered as a "${existingRole}". Under institutional policy, an email address cannot be reassigned to a different role.`,
          },
          { status: 400 }
        );
      }

      const { data: updated, error: updateError } = await supabase
        .from("users")
        .update({
          user_id: cleanUserId,
          email: cleanEmail,
          user_role: cleanRole,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userData.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      userData = updated;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("users")
        .insert({
          user_id: cleanUserId,
          email: cleanEmail,
          user_role: cleanRole,
        })
        .select()
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      userData = inserted;
    }

    // Role-specific profile syncing
    if (cleanRole === "teacher") {
      const names = (fullName || "Faculty Member").split(" ");
      const firstName = names[0] || "Faculty";
      const lastName = names.slice(1).join(" ") || "Teacher";

      await supabase.from("teachers").upsert(
        {
          user_id: userData.id,
          teacher_id: cleanUserId,
          first_name: firstName,
          last_name: lastName,
          department: department || "CROSS_LEVEL",
          email: cleanEmail,
        },
        { onConflict: "teacher_id" }
      );
    } else if (cleanRole === "admin") {
      const names = (fullName || "School Administrator").split(" ");
      const firstName = names[0] || "Admin";
      const lastName = names.slice(1).join(" ") || "Officer";

      await supabase.from("school_administrators").upsert(
        {
          user_id: userData.id,
          admin_id: cleanUserId,
          first_name: firstName,
          last_name: lastName,
          department: department || "Academic Affairs",
        },
        { onConflict: "admin_id" }
      );
    } else if (cleanRole === "it_support") {
      await supabase.from("it_supports").upsert(
        {
          user_id: userData.id,
          itsupport_id: cleanUserId,
          system_role: department || "System Administrator",
        },
        { onConflict: "itsupport_id" }
      );
    }

    // Generate an onboarding invitation link for staff roles
    let inviteUrl = "";
    let token = "";
    if (["teacher", "admin", "it_support"].includes(cleanRole)) {
      const randomHex = Math.random().toString(36).substring(2, 12);
      token = `${Date.now()}_${randomHex}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      try {
        const { data: setRow } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "staff_invitations")
          .maybeSingle();

        let invitationsList: any[] = [];
        if (setRow && setRow.value && Array.isArray(setRow.value.invitations)) {
          invitationsList = setRow.value.invitations;
        }

        const newInv = {
          id: `inv_${Date.now()}_${randomHex}`,
          email: cleanEmail,
          role: cleanRole,
          fullName: fullName || "",
          department: department || "",
          token,
          status: "pending",
          invitedAt: new Date().toISOString(),
          acceptedAt: null,
          expiresAt,
        };

        const updated = invitationsList.filter(
          (i: any) => !(i.email === cleanEmail && i.role === cleanRole && i.status === "pending")
        );
        updated.unshift(newInv);

        await supabase.from("system_settings").upsert({
          key: "staff_invitations",
          value: { invitations: updated },
          updated_at: new Date().toISOString(),
        });
      } catch (invErr) {
        console.warn("Notice: could not save staff invitation in system_settings:", invErr);
      }

      const host = req.headers.get("host") || "";
      const isLocal = req.url.includes("localhost") || req.url.includes("127.0.0.1") || host.includes("localhost");
      let portalBaseUrl = "";
      if (cleanRole === "teacher") {
        portalBaseUrl = isLocal ? "http://localhost:3001" : (process.env.NEXT_PUBLIC_TEACHER_URL || "https://dumalnext-teacher.vercel.app");
      } else if (cleanRole === "admin") {
        portalBaseUrl = isLocal ? "http://localhost:3000" : (process.env.NEXT_PUBLIC_ADMIN_URL || "https://dumalnext-admin.vercel.app");
      } else {
        portalBaseUrl = isLocal ? "http://localhost:3003" : (process.env.NEXT_PUBLIC_ITSUPPORT_URL || "https://dumalnext-it-support.vercel.app");
      }
      inviteUrl = `${portalBaseUrl}/?token=${token}`;
    }

    return NextResponse.json({
      success: true,
      inviteUrl,
      token,
      user: {
        id: userData.id,
        userId: userData.user_id || cleanUserId,
        email: userData.email || cleanEmail,
        userRole: userData.user_role || cleanRole,
        createdAt: userData.created_at || new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to provision user" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = getAdminClient() || (await createClient());
    let id: string | null = null;
    let email: string | null = null;
    let userId: string | null = null;

    try {
      const body = await req.json();
      id = body.id || null;
      email = body.email || null;
      userId = body.userId || null;
    } catch {
      const { searchParams } = new URL(req.url);
      id = searchParams.get("id");
      email = searchParams.get("email");
      userId = searchParams.get("userId");
    }

    if (!id && !email && !userId) {
      return NextResponse.json(
        { error: "User ID or Email is required for deletion." },
        { status: 400 }
      );
    }

    // Locate the user record in users table
    let query = supabase.from("users").select("*");
    if (id) {
      query = query.eq("id", id);
    } else if (email) {
      query = query.eq("email", email.trim().toLowerCase());
    } else if (userId) {
      query = query.eq("user_id", userId.trim().toUpperCase());
    }

    const { data: existing, error: findError } = await query.limit(1);
    if (findError) {
      return NextResponse.json({ error: findError.message }, { status: 500 });
    }

    const targetUser = existing?.[0];
    if (!targetUser) {
      return NextResponse.json({ success: true, message: "User not found or already deleted." });
    }

    // Clean up dependent profile records
    await Promise.all([
      supabase.from("teachers").delete().or(`user_id.eq.${targetUser.id},email.eq.${targetUser.email}`),
      supabase.from("school_administrators").delete().eq("user_id", targetUser.id),
      supabase.from("it_supports").delete().eq("user_id", targetUser.id),
      supabase.from("students").delete().eq("user_id", targetUser.id),
    ]);

    // Delete from public.users table
    const { error: delError } = await supabase
      .from("users")
      .delete()
      .eq("id", targetUser.id);

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    // If Supabase Service Role Key is configured, also purge the credential from Supabase Auth
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (serviceKey && projectUrl) {
      try {
        const serviceClient = createSupabaseJsClient(projectUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        if (targetUser.id) {
          await serviceClient.auth.admin.deleteUser(targetUser.id);
        }
      } catch (authErr) {
        console.warn("Could not delete user from Supabase Auth:", authErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `User ${targetUser.email} (${targetUser.user_id}) deleted successfully.`,
      deletedId: targetUser.id,
    });
  } catch (err: any) {
    console.error("DELETE /api/users error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete user" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = getAdminClient() || (await createClient());
    const body = await req.json();
    const { id, userId, email, action, newEmail, newLrn, newFullName } = body;

    const targetId = id || null;
    const targetUserId = userId || null;
    const targetEmail = email ? String(email).trim().toLowerCase() : null;

    if (!targetId && !targetUserId && !targetEmail) {
      return NextResponse.json(
        { error: "User identifier (id, userId, or email) is required." },
        { status: 400 }
      );
    }

    // Locate target user
    let query = supabase.from("users").select("*");
    if (targetId) query = query.eq("id", targetId);
    else if (targetUserId) query = query.eq("user_id", targetUserId.trim().toUpperCase());
    else if (targetEmail) query = query.eq("email", targetEmail);

    const { data: existing, error: findError } = await query.limit(1);
    if (findError || !existing || existing.length === 0) {
      return NextResponse.json(
        { error: "User record not found." },
        { status: 404 }
      );
    }

    const targetUser = existing[0];
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let serviceClient: any = null;
    if (serviceKey && projectUrl) {
      serviceClient = createSupabaseJsClient(projectUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }

    // ACTION 1: Remove Password
    // In accordance with security policy, IT Support CANNOT see the password.
    // The current password is removed/invalidated by setting a randomized non-reusable entropy string
    // and invalidating all active sessions so the account cannot be logged into with the old password.
    if (action === "remove_password") {
      if (serviceClient && targetUser.id) {
        try {
          const randomEntropy = Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          await serviceClient.auth.admin.updateUserById(targetUser.id, {
            password: `Revoked_${randomEntropy}!`,
            email_confirm: true,
          });
          try {
            await serviceClient.auth.admin.signOut(targetUser.id);
          } catch {}
        } catch (authErr: any) {
          console.warn("Could not invalidate password in Supabase Auth:", authErr);
        }
      }

      await supabase
        .from("users")
        .update({
          password: "REMOVED_BY_IT",
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetUser.id);

      return NextResponse.json({
        success: true,
        message: "Password has been successfully removed and invalidated. For security and student privacy, passwords are never shown. The previous password will no longer work.",
        action: "remove_password",
      });
    }

    // ACTION 2: Remove LRN
    if (action === "remove_lrn") {
      await supabase
        .from("students")
        .update({ student_id: null, updated_at: new Date().toISOString() })
        .eq("user_id", targetUser.id);

      if (targetUser.user_role === "student" && targetUser.user_id && /^\d{12}$/.test(targetUser.user_id)) {
        await supabase
          .from("users")
          .update({
            user_id: `STU-${targetUser.id.substring(0, 8).toUpperCase()}`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", targetUser.id);
      }

      return NextResponse.json({
        success: true,
        message: "Learner Reference Number (LRN) has been removed from this account.",
        action: "remove_lrn",
      });
    }

    // ACTION 3: Remove Email
    if (action === "remove_email") {
      await supabase
        .from("users")
        .update({
          email: "",
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetUser.id);

      if (targetUser.user_role === "teacher") {
        await supabase
          .from("teachers")
          .update({ email: "" })
          .eq("user_id", targetUser.id);
      }

      return NextResponse.json({
        success: true,
        message: "Email address has been removed from this user record.",
        action: "remove_email",
      });
    }

    // ACTION 4: Modify Details (Email, LRN, Full Name)
    if (action === "modify_details" || !action) {
      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      let cleanNewEmail = newEmail !== undefined && newEmail !== null ? String(newEmail).trim().toLowerCase() : null;
      let cleanNewLrn = newLrn !== undefined && newLrn !== null ? String(newLrn).replace(/\D/g, "").slice(0, 12) : null;

      if (cleanNewEmail !== null && cleanNewEmail !== targetUser.email) {
        if (cleanNewEmail) {
          const { data: duplicate } = await supabase
            .from("users")
            .select("id")
            .eq("email", cleanNewEmail)
            .neq("id", targetUser.id)
            .limit(1);

          if (duplicate && duplicate.length > 0) {
            return NextResponse.json(
              { error: `The email address "${cleanNewEmail}" is already registered to another account.` },
              { status: 400 }
            );
          }
        }

        updates.email = cleanNewEmail;

        if (serviceClient && targetUser.id && cleanNewEmail) {
          try {
            await serviceClient.auth.admin.updateUserById(targetUser.id, {
              email: cleanNewEmail,
              email_confirm: true,
            });
          } catch (authErr: any) {
            console.warn("Could not sync email with Supabase Auth:", authErr);
          }
        }

        if (targetUser.user_role === "teacher") {
          await supabase
            .from("teachers")
            .update({ email: cleanNewEmail })
            .eq("user_id", targetUser.id);
        }
      }

      if (cleanNewLrn !== null) {
        const { data: stRec } = await supabase
          .from("students")
          .select("id")
          .eq("user_id", targetUser.id)
          .limit(1);

        if (stRec && stRec.length > 0) {
          await supabase
            .from("students")
            .update({ student_id: cleanNewLrn || null, updated_at: new Date().toISOString() })
            .eq("user_id", targetUser.id);
        }

        if (targetUser.user_role === "student" && cleanNewLrn) {
          updates.user_id = cleanNewLrn;
        }
      }

      if (newFullName && String(newFullName).trim()) {
        const parts = String(newFullName).trim().split(" ");
        const firstName = parts[0] || "";
        const lastName = parts.slice(1).join(" ") || "";

        if (targetUser.user_role === "student") {
          await supabase
            .from("students")
            .update({ first_name: firstName, last_name: lastName })
            .eq("user_id", targetUser.id);
        } else if (targetUser.user_role === "teacher") {
          await supabase
            .from("teachers")
            .update({ first_name: firstName, last_name: lastName })
            .eq("user_id", targetUser.id);
        } else if (targetUser.user_role === "admin") {
          await supabase
            .from("school_administrators")
            .update({ first_name: firstName, last_name: lastName })
            .eq("user_id", targetUser.id);
        }
      }

      if (Object.keys(updates).length > 1) {
        const { error: updErr } = await supabase
          .from("users")
          .update(updates)
          .eq("id", targetUser.id);

        if (updErr) {
          return NextResponse.json({ error: updErr.message }, { status: 500 });
        }
      }

      return NextResponse.json({
        success: true,
        message: "User account credentials and identity records successfully updated.",
        action: "modify_details",
        updated: {
          email: updates.email !== undefined ? updates.email : targetUser.email,
          userId: updates.user_id || targetUser.user_id,
          lrn: cleanNewLrn || undefined,
        },
      });
    }

    return NextResponse.json({ error: "Invalid action specified." }, { status: 400 });
  } catch (err: any) {
    console.error("PATCH /api/users error:", err);
    return NextResponse.json({ error: err.message || "Failed to update user" }, { status: 500 });
  }
}

