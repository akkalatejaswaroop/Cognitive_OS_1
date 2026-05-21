import { notFound } from 'next/navigation'
import { User, Briefcase, Globe, Heart, MapPin, ExternalLink } from 'lucide-react'

interface PublicProfile {
  id: string
  full_name?: string | null
  name?: string | null
  avatar_url?: string | null
  role_title?: string | null
  company?: string | null
  timezone?: string
  dob?: string | null
  phone_number?: string | null
  social_profiles?: { instagram?: string; linkedin?: string; [key: string]: string | undefined } | null
  interests?: string[] | null
  hobbies?: string[] | null
  public_profile_url?: string | null
}

async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_ENDPOINT || 'http://localhost:8000'
    const res = await fetch(`${apiBase}/api/v1/auth/public/${username}`, {
      next: { revalidate: 60 }
    })
    if (!res.ok) {
      if (res.status === 404) return null
      throw new Error('Failed to fetch profile')
    }
    return res.json()
  } catch (error) {
    console.error("Error fetching public profile:", error)
    return null
  }
}

export default async function PublicProfilePage({ params }: { params: { username: string } }) {
  const profile = await getPublicProfile(params.username)

  if (!profile) {
    notFound()
  }

  const apiBase = process.env.NEXT_PUBLIC_API_ENDPOINT || 'http://localhost:8000'
  const displayName = profile.full_name || profile.name || 'Anonymous'
  const avatarSrc = profile.avatar_url
    ? profile.avatar_url.startsWith('http')
      ? profile.avatar_url
      : `${apiBase}${profile.avatar_url}`
    : null

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-20 px-4">
      <div className="w-full max-w-3xl space-y-8">

        {/* Header Profile Section */}
        <div className="bg-card/50 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-sm flex flex-col items-center text-center">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-background shadow-lg bg-muted flex items-center justify-center mb-6">
            {avatarSrc ? (
              <img src={avatarSrc} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-muted-foreground" />
            )}
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-foreground">{displayName}</h1>

          {(profile.role_title || profile.company) && (
            <p className="text-lg text-muted-foreground mt-2 flex items-center gap-2 justify-center">
              <Briefcase className="w-4 h-4" />
              {profile.role_title}
              {profile.role_title && profile.company && ' at '}
              {profile.company && <span className="font-medium text-foreground">{profile.company}</span>}
            </p>
          )}

          {profile.timezone && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1 justify-center">
              <MapPin className="w-3.5 h-3.5" />
              {profile.timezone}
            </p>
          )}

          <div className="flex items-center gap-4 mt-6 justify-center flex-wrap">
            {profile.social_profiles?.instagram && (
              <a
                href={profile.social_profiles.instagram.startsWith('http') ? profile.social_profiles.instagram : `https://${profile.social_profiles.instagram}`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground rounded-full transition-colors text-sm font-medium"
              >
                <ExternalLink className="w-4 h-4" /> Instagram
              </a>
            )}
            {profile.social_profiles?.linkedin && (
              <a
                href={profile.social_profiles.linkedin.startsWith('http') ? profile.social_profiles.linkedin : `https://${profile.social_profiles.linkedin}`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground rounded-full transition-colors text-sm font-medium"
              >
                <ExternalLink className="w-4 h-4" /> LinkedIn
              </a>
            )}
            {profile.public_profile_url && (
              <div className="px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full flex items-center gap-2">
                <Globe className="w-4 h-4" />
                /u/{profile.public_profile_url}
              </div>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          <div className="bg-card border border-border rounded-3xl p-8 shadow-sm space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 border-b border-border pb-4">
              <User className="w-5 h-5 text-primary" /> About
            </h2>

            <div className="space-y-4">
              {profile.timezone && (
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-1">Timezone</span>
                  <span className="text-sm">{profile.timezone}</span>
                </div>
              )}
              {profile.dob && (
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-1">Date of Birth</span>
                  <span className="text-sm">{new Date(profile.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-3xl p-8 shadow-sm space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 border-b border-border pb-4">
              <Heart className="w-5 h-5 text-primary" /> Interests & Hobbies
            </h2>

            <div className="space-y-6">
              {profile.interests && profile.interests.length > 0 && (
                <div>
                  <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2 block">Interests</span>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest, i) => (
                      <span key={i} className="px-3 py-1 bg-muted rounded-full text-sm">{interest}</span>
                    ))}
                  </div>
                </div>
              )}

              {profile.hobbies && profile.hobbies.length > 0 && (
                <div>
                  <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2 block">Hobbies</span>
                  <div className="flex flex-wrap gap-2">
                    {profile.hobbies.map((hobby, i) => (
                      <span key={i} className="px-3 py-1 bg-primary/5 text-primary border border-primary/10 rounded-full text-sm">{hobby}</span>
                    ))}
                  </div>
                </div>
              )}

              {(!profile.interests?.length && !profile.hobbies?.length) && (
                <p className="text-muted-foreground text-sm italic">No interests listed yet.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
