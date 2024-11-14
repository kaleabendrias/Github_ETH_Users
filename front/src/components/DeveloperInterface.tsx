import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import UserProfileModal from "./UserProfile";

interface Developer {
  username: string;
  avatar: string;
  profile: string;
  repos_url: string;
  followers: number;
}

interface ApiError {
  error: string;
  message: string;
}

interface DeveloperCardProps {
  developer: Developer;
  onSelect: (username: string) => void;
  onProfileClick: (url: string) => void;
}

const ITEMS_PER_PAGE = 20;

const DeveloperCard: React.FC<DeveloperCardProps> = ({
  developer,
  onSelect,
  onProfileClick,
}) => (
  <Card
    className="flex items-start p-4 space-x-4 cursor-pointer hover:bg-accent/50 transition-colors"
    onClick={() => onSelect(developer.username)}
  >
    <Avatar className="h-12 w-12">
      <AvatarImage src={developer.avatar} alt={developer.username} />
      <AvatarFallback>{developer.username[0].toUpperCase()}</AvatarFallback>
    </Avatar>
    <div className="flex-1">
      <h3 className="font-semibold">{developer.username}</h3>
      <p className="text-sm text-muted-foreground">
        {developer.followers} followers
      </p>
      <Button
        variant="link"
        className="h-6 p-0"
        onClick={(e) => {
          e.stopPropagation();
          onProfileClick(developer.profile);
        }}
      >
        View Profile <ExternalLink className="ml-1 h-3 w-3" />
      </Button>
    </div>
  </Card>
);

const DevelopersInterface: React.FC = () => {
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);

  useEffect(() => {
    const fetchDevelopers = async () => {
      try {
        const response = await fetch("https://github-eth-users.vercel.app/developers");
        if (!response.ok) {
          const errorData: ApiError = await response.json();
          throw new Error(errorData.message || "Failed to fetch developers");
        }
        const data: Developer[] = await response.json();
        setDevelopers(data);
        setError(null);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An error occurred";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchDevelopers();
  }, []);

  const filteredDevelopers = React.useMemo(
    () =>
      developers.filter((dev) =>
        dev.username.toLowerCase().includes(search.toLowerCase())
      ),
    [developers, search]
  );

  const totalPages = Math.ceil(filteredDevelopers.length / ITEMS_PER_PAGE);

  const paginatedDevelopers = React.useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDevelopers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredDevelopers, currentPage]);

  const handleProfileClick = (url: string): void => {
    window.open(url, "_blank", "noopener noreferrer");
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisible = 5;
    const halfVisible = Math.floor(maxVisible / 2);

    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      items.push(
        <PaginationItem key="first">
          <PaginationLink onClick={() => handlePageChange(1)}>1</PaginationLink>
        </PaginationItem>
      );
      if (startPage > 2) {
        items.push(
          <PaginationItem key="ellipsis1">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            isActive={currentPage === i}
            onClick={() => handlePageChange(i)}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(
          <PaginationItem key="ellipsis2">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
      items.push(
        <PaginationItem key="last">
          <PaginationLink onClick={() => handlePageChange(totalPages)}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Ethiopian GitHub Developers ({filteredDevelopers.length})
          </CardTitle>
          <div className="flex gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search developers..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="text-center py-8">Loading developers...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {paginatedDevelopers.map((dev) => (
                  <DeveloperCard
                    key={dev.username}
                    developer={dev}
                    onSelect={setSelectedUsername}
                    onProfileClick={handleProfileClick}
                  />
                ))}
              </div>

              <Pagination className="mt-8">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        handlePageChange(Math.max(1, currentPage - 1))
                      }
                      className={
                        currentPage === 1
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>

                  {renderPaginationItems()}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        handlePageChange(Math.min(totalPages, currentPage + 1))
                      }
                      className={
                        currentPage === totalPages
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </>
          )}
        </CardContent>
      </Card>

      {/* Profile Modal */}
      <UserProfileModal
        username={selectedUsername || ""}
        isOpen={!!selectedUsername}
        onClose={() => setSelectedUsername(null)}
      />
    </div>
  );
};

export default DevelopersInterface;
