import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  GitFork, 
  Star,
  MapPin, 
  Link as LinkIcon, 
  Calendar,
  ArrowLeft,
  ExternalLink 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader
} from "@/components/ui/dialog";

interface Language {
  name: string;
  bytes: number;
}

interface Repository {
  id: number;
  name: string;
  description: string;
  url: string;
  stars: number;
  forks: number;
  language: string;
  updated_at: string;
  created_at: string;
  topics: string[];
  visibility: string;
}

interface UserProfile {
  profile: {
    login: string;
    name: string;
    avatar_url: string;
    html_url: string;
    bio: string;
    location: string;
    blog: string;
    company: string;
    created_at: string;
    followers_preview: Array<{
      login: string;
      avatar_url: string;
      html_url: string;
    }>;
    organizations: Array<{
      login: string;
      avatar_url: string;
      url: string;
    }>;
  };
  statistics: {
    totalRepos: number;
    totalContributions: number;
    followerCount: number;
    followingCount: number;
  };
  languages: Language[];
  repositories: Repository[];
}

interface UserProfileModalProps {
  username: string;
  isOpen: boolean;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ username, isOpen, onClose }) => {
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!isOpen) return;
      
      try {
        setLoading(true);
        const response = await fetch(`https://github-eth-users.onrender.com/user/${username}`);
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        const data = await response.json();
        setUserData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [username, isOpen]);

  const getTotalBytes = (languages: Language[]) => {
    return languages.reduce((sum, lang) => sum + lang.bytes, 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const openExternalLink = (url: string) => {
    window.open(url, '_blank', 'noopener noreferrer');
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <Button variant="ghost" className="absolute left-4 top-4" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading profile...</div>
          </div>
        ) : error ? (
          <div className="text-red-500 p-4">{error}</div>
        ) : userData && (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-start space-x-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={userData.profile.avatar_url} alt={userData.profile.login} />
                <AvatarFallback>{userData.profile.login[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{userData.profile.name}</h2>
                <p className="text-muted-foreground">{userData.profile.login}</p>
                <p className="mt-2">{userData.profile.bio}</p>
                <div className="flex items-center space-x-4 mt-4">
                  {userData.profile.location && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-1" />
                      {userData.profile.location}
                    </div>
                  )}
                  {userData.profile.blog && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <LinkIcon className="h-4 w-4 mr-1" />
                      <a href={userData.profile.blog} target="_blank" rel="noopener noreferrer" 
                         className="hover:underline">{userData.profile.blog}</a>
                    </div>
                  )}
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-1" />
                    Joined {formatDate(userData.profile.created_at)}
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: 'Repositories', value: userData.statistics.totalRepos },
                { label: 'Followers', value: userData.statistics.followerCount },
                { label: 'Following', value: userData.statistics.followingCount },
                { label: 'Contributions', value: userData.statistics.totalContributions }
              ].map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Languages */}
            <Card>
              <CardHeader>
                <CardTitle>Top Languages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-4 rounded-full overflow-hidden bg-muted">
                  {userData.languages.slice(0, 5).map((lang, index) => {
                    const percentage = (lang.bytes / getTotalBytes(userData.languages)) * 100;
                    const colors = ['bg-blue-500', 'bg-yellow-500', 'bg-green-500', 'bg-red-500', 'bg-purple-500'];
                    return (
                      <div
                        key={lang.name}
                        className={`h-full ${colors[index]} float-left`}
                        style={{ width: `${percentage}%` }}
                      />
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {userData.languages.slice(0, 5).map((lang, index) => (
                    <div key={lang.name} className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-1 ${['bg-blue-500', 'bg-yellow-500', 'bg-green-500', 'bg-red-500', 'bg-purple-500'][index]}`} />
                      <span className="text-sm">
                        {lang.name} ({((lang.bytes / getTotalBytes(userData.languages)) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Repositories */}
            <Card>
              <CardHeader>
                <CardTitle>Popular Repositories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userData.repositories
                    .sort((a, b) => b.stars - a.stars)
                    .slice(0, 6)
                    .map((repo) => (
                      <Card key={repo.id} className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold hover:underline cursor-pointer" 
                                onClick={() => openExternalLink(repo.url)}>
                              {repo.name}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {repo.description || 'No description provided'}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => openExternalLink(repo.url)}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-4 mt-4">
                          {repo.language && (
                            <span className="flex items-center text-sm">
                              <div className="w-2 h-2 rounded-full bg-primary mr-1" />
                              {repo.language}
                            </span>
                          )}
                          <span className="flex items-center text-sm">
                            <Star className="h-4 w-4 mr-1" />
                            {repo.stars}
                          </span>
                          <span className="flex items-center text-sm">
                            <GitFork className="h-4 w-4 mr-1" />
                            {repo.forks}
                          </span>
                        </div>
                      </Card>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Followers Preview */}
            {userData.profile.followers_preview.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Followers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {userData.profile.followers_preview.map((follower) => (
                      <Avatar key={follower.login} className="h-10 w-10 cursor-pointer" 
                              onClick={() => openExternalLink(follower.html_url)}>
                        <AvatarImage src={follower.avatar_url} alt={follower.login} />
                        <AvatarFallback>{follower.login[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileModal;