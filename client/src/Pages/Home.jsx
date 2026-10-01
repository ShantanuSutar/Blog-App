import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, CircleCheck, RotateCcw } from "lucide-react";
import { useThemeContext } from "../Context/theme";
import Menu from "../Components/Menu";
import Newsletter from "../Components/Newsletter";
import HomeFilters from "../Components/home/HomeFilters";
import HomeSkeleton from "../Components/home/HomeSkeleton";
import PostCard from "../Components/home/PostCard";
import { getPostTags } from "../Components/home/postPresentation";

const baseUrl = import.meta.env.VITE_BASE_URL;
const createFeed = (key) => ({ key, posts: [], page: 1, totalPages: 1, status: "loading", loadMoreStatus: "idle" });

function getPostsFromResponse(data) {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.posts) ? data.posts : [];
}

function getBrowseUrl(category, search) {
  const params = new URLSearchParams();
  if (category) params.set("cat", category);
  if (search) params.set("search", search);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export default function Home() {
  const { theme } = useThemeContext();
  const navigate = useNavigate();
  const location = useLocation();
  const { tag: urlTag } = useParams();
  const params = new URLSearchParams(location.search);
  const category = params.get("cat") || "";
  const search = params.get("search") || "";
  const activeTag = urlTag || "";
  const filterKey = JSON.stringify([category, search, activeTag]);
  const hasFilters = Boolean(category || search || activeTag);
  const sentinelRef = useRef(null);

  const [feed, setFeed] = useState(() => createFeed(filterKey));
  const [requestVersion, setRequestVersion] = useState(0);
  const [featured, setFeatured] = useState({ posts: [], status: "loading" });
  const [featuredVersion, setFeaturedVersion] = useState(0);
  const [allTags, setAllTags] = useState([]);

  useEffect(() => {
    setFeed((current) => current.key === filterKey ? current : createFeed(filterKey));
  }, [filterKey]);

  useEffect(() => {
    if (feed.key !== filterKey) return;
    const controller = new AbortController();
    const page = feed.page;

    const fetchPosts = async () => {
      try {
        let response;
        if (activeTag) {
          response = await axios.get(`${baseUrl}/api/posts/tag/${encodeURIComponent(activeTag)}`, { signal: controller.signal });
        } else {
          const query = new URLSearchParams({ page: String(page), limit: "10" });
          if (category) query.set("cat", category);
          if (search) query.set("search", search);
          response = await axios.get(`${baseUrl}/api/posts?${query.toString()}`, { signal: controller.signal });
        }

        const nextPosts = getPostsFromResponse(response.data);
        const reportedPages = Number(response.data?.totalPages);
        const totalPages = activeTag || nextPosts.length === 0
          ? page
          : Number.isFinite(reportedPages) && reportedPages > 0 ? Math.max(page, reportedPages) : page;

        setFeed((current) => {
          if (current.key !== filterKey || current.page !== page) return current;
          const seen = new Set(page === 1 ? [] : current.posts.map((post) => post.id));
          const additions = nextPosts.filter((post) => !seen.has(post.id));
          return {
            ...current,
            posts: page === 1 ? nextPosts : [...current.posts, ...additions],
            totalPages: additions.length === 0 ? page : totalPages,
            status: "success",
            loadMoreStatus: "idle",
          };
        });
      } catch (error) {
        if (controller.signal.aborted || axios.isCancel(error)) return;
        setFeed((current) => current.key !== filterKey || current.page !== page
          ? current
          : { ...current, status: page === 1 ? "error" : current.status, loadMoreStatus: page === 1 ? "idle" : "error" });
      }
    };

    fetchPosts();
    return () => controller.abort();
  }, [feed.key, feed.page, filterKey, activeTag, category, search, requestVersion]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchFeatured = async () => {
      try {
        const response = await axios.get(`${baseUrl}/api/posts/featured`, { signal: controller.signal });
        setFeatured({ posts: getPostsFromResponse(response.data), status: "success" });
      } catch (error) {
        if (!controller.signal.aborted && !axios.isCancel(error)) {
          setFeatured((current) => ({ ...current, status: "error" }));
        }
      }
    };
    fetchFeatured();
    return () => controller.abort();
  }, [featuredVersion]);

  useEffect(() => {
    const controller = new AbortController();
    axios.get(`${baseUrl}/api/posts`, { signal: controller.signal })
      .then((response) => {
        const tags = getPostsFromResponse(response.data).flatMap((post) => getPostTags(post.tags));
        setAllTags([...new Set(tags)].sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (feed.key !== filterKey || feed.status !== "success" || feed.loadMoreStatus !== "idle" || feed.page >= feed.totalPages || !feed.posts.length) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setFeed((current) => current.key === filterKey && current.loadMoreStatus === "idle" && current.page < current.totalPages
        ? { ...current, page: current.page + 1, loadMoreStatus: "loading" }
        : current);
    }, { rootMargin: "240px 0px", threshold: 0 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [feed.key, feed.status, feed.loadMoreStatus, feed.page, feed.totalPages, feed.posts.length, filterKey]);

  const retryFeed = () => {
    setFeed((current) => ({ ...current, status: current.page === 1 ? "loading" : current.status, loadMoreStatus: current.page === 1 ? "idle" : "loading" }));
    setRequestVersion((version) => version + 1);
  };

  const retryFeatured = () => {
    setFeatured((current) => ({ ...current, status: "loading" }));
    setFeaturedVersion((version) => version + 1);
  };

  const handleCategory = (value) => navigate(getBrowseUrl(value, search));
  const handleSearch = (value) => navigate(getBrowseUrl(activeTag ? "" : category, value));
  const handleTag = (value) => navigate(`/tag/${encodeURIComponent(value)}`);
  const visibleFeed = feed.key === filterKey ? feed : createFeed(filterKey);
  const visibleTags = [...new Set([...allTags, ...featured.posts.flatMap((post) => getPostTags(post.tags)), ...visibleFeed.posts.flatMap((post) => getPostTags(post.tags)), ...(activeTag ? [activeTag] : [])])].sort((a, b) => a.localeCompare(b));

  return (
    <div className="home-page">
      <header className="home-page__intro">
        <span className="home-section-kicker">Unsaid · Stories and more</span>
        <h1>Stories worth slowing down for.</h1>
        <p>Ideas, experiences, and perspectives from the voices behind Unsaid.</p>
      </header>

      {!hasFilters && (
        <section className="home-featured" aria-labelledby="featured-heading">
          <div className="home-section-heading"><div><span className="home-section-kicker">Editor’s selection</span><h2 id="featured-heading">Featured stories</h2></div></div>
          {featured.status === "loading" && <HomeSkeleton featured count={2} />}
          {featured.status === "error" && <div className="home-state home-state--compact" role="alert"><p>Featured stories couldn’t be loaded.</p><button className="ui-button--secondary" type="button" onClick={retryFeatured}><RotateCcw size={16} aria-hidden="true" /> Try again</button></div>}
          {featured.status === "success" && featured.posts.length > 0 && (
            <div className="home-featured-grid">
              {featured.posts.map((post, index) => <PostCard key={post.id} post={post} variant={index === 0 ? "featured-primary" : "featured"} theme={theme} baseUrl={baseUrl} />)}
            </div>
          )}
        </section>
      )}

      <HomeFilters activeCategory={category} activeTag={activeTag} searchQuery={search} tags={visibleTags} onSearch={handleSearch} onCategory={handleCategory} onTag={handleTag} onClear={() => navigate("/")} />

      <section className="home-latest" aria-labelledby="latest-heading">
        <div className="home-section-heading">
          <div>
            <span className="home-section-kicker">The feed</span>
            <h2 id="latest-heading">{activeTag ? `Stories tagged #${activeTag}` : search ? `Results for “${search}”` : category ? `${category === "scitech" ? "Sci-Tech" : category.charAt(0).toUpperCase() + category.slice(1)} stories` : "Latest stories"}</h2>
          </div>
          {!hasFilters && <span className="home-section-heading__note">Fresh perspectives, one story at a time <ArrowRight size={16} aria-hidden="true" /></span>}
        </div>
        <div className="home-feed-layout">
          <div className="home-feed-layout__main" aria-live="polite" aria-busy={visibleFeed.status === "loading"}>
            {visibleFeed.status === "loading" && <HomeSkeleton count={3} />}
            {visibleFeed.status === "error" && <div className="home-state" role="alert"><h3>We couldn’t load the stories.</h3><p>Check your connection and try again.</p><button className="ui-button--primary" type="button" onClick={retryFeed}><RotateCcw size={16} aria-hidden="true" /> Retry</button></div>}
            {visibleFeed.status === "success" && visibleFeed.posts.length === 0 && <div className="home-state"><h3>{hasFilters ? "No stories match these filters" : "No stories yet"}</h3><p>{hasFilters ? "Try another category, tag, or search term." : "Check back soon for new stories."}</p>{hasFilters && <button className="ui-button--secondary" type="button" onClick={() => navigate("/")}>Clear filters</button>}</div>}
            {visibleFeed.posts.length > 0 && (
              <>
                <div className="home-feed-list">{visibleFeed.posts.map((post) => <PostCard key={post.id} post={post} theme={theme} baseUrl={baseUrl} />)}</div>
                {visibleFeed.loadMoreStatus === "loading" && <div className="home-load-more" role="status"><HomeSkeleton count={1} /><p>Loading more stories…</p></div>}
                {visibleFeed.loadMoreStatus === "error" && <div className="home-state home-state--compact" role="alert"><p>More stories couldn’t be loaded. Your current stories are still here.</p><button className="ui-button--secondary" type="button" onClick={retryFeed}><RotateCcw size={16} aria-hidden="true" /> Retry loading</button></div>}
                {visibleFeed.loadMoreStatus === "idle" && visibleFeed.page >= visibleFeed.totalPages && <p className="home-feed-end" role="status"><CircleCheck size={17} aria-hidden="true" /> You’re all caught up.</p>}
                <div ref={sentinelRef} className="home-scroll-sentinel" aria-hidden="true" />
              </>
            )}
          </div>
          <aside className="home-sidebar" aria-label="More from Unsaid"><Menu cat={category} /><Newsletter /></aside>
        </div>
      </section>
    </div>
  );
}
