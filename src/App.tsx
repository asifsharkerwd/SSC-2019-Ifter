/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  User, 
  Upload, 
  CheckCircle, 
  Trash2, 
  Settings, 
  LogOut, 
  ChevronRight, 
  Instagram, 
  Facebook, 
  Twitter, 
  Mail, 
  Phone, 
  MapPin,
  Loader2,
  Image as ImageIcon,
  Search,
  Plus,
  X,
  Save,
  ChevronLeft,
  LayoutDashboard,
  Users,
  Camera,
  RefreshCw,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from './lib/supabase';

// Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Registration {
  id: string;
  name: string;
  phone: string;
  photo_url: string;
  is_approved: boolean;
  created_at: string;
}

interface GalleryImage {
  id: string;
  url: string;
  caption?: string;
  created_at: string;
}

interface HeroSlide {
  id: string;
  url: string;
  title: string;
  subtitle: string;
}

// --- Utilities ---

const syncToGoogleSheets = async (data: any) => {
  const sheetsUrl = import.meta.env.VITE_GOOGLE_SHEETS_URL || 'https://script.google.com/macros/s/AKfycbxDV9XsTqnSDiIZXjMTxv2-ueURWzniCax-pxQSdDvrfqLlomgaPvHzFM5HKQmQa1L_/exec';
  if (!sheetsUrl) return;

  try {
    // Using a simpler approach for Google Apps Script compatibility
    const queryString = new URLSearchParams(data).toString();
    const finalUrl = `${sheetsUrl}?${queryString}`;

    // Using a simple fetch with no-cors. 
    // Sometimes GET is more reliable for GAS redirects in no-cors mode
    await fetch(finalUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(data)
    });
    console.log('Google Sheets sync attempted for:', data.name);
  } catch (err) {
    console.error('Google Sheets sync error:', err);
  }
};

const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.5)); // Compress to 50% quality JPEG
    };
  });
};

// --- Shared Components ---

const Lightbox = ({ images, initialIndex, onClose }: { images: string[], initialIndex: number, onClose: () => void }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="lightbox-overlay"
    onClick={onClose}
  >
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="relative w-full max-w-5xl h-[80vh]"
      onClick={(e) => e.stopPropagation()}
    >
      <button 
        onClick={onClose}
        className="absolute -top-12 right-0 text-white hover:text-gold transition-colors z-[110]"
      >
        <X size={32} />
      </button>
      
      <Swiper
        modules={[Navigation, Pagination]}
        initialSlide={initialIndex}
        navigation
        pagination={{ type: 'fraction' }}
        className="h-full w-full rounded-2xl overflow-hidden"
      >
        {images.map((img, idx) => (
          <SwiperSlide key={idx} className="flex items-center justify-center bg-black/20">
            <img 
              src={img} 
              alt={`Gallery ${idx}`} 
              className="max-w-full max-h-full object-contain"
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </motion.div>
  </motion.div>
);

// --- Main Landing Page ---

const LandingPage = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [eventDate, setEventDate] = useState('২৭শে রমজান');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [lightboxData, setLightboxData] = useState<{ images: string[], index: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      // Fetch registrations
      const { data: regs } = await supabase.from('registrations').select('*');
      if (regs) setRegistrations(regs);

      // Fetch hero slides
      const { data: hero } = await supabase.from('hero').select('*').order('id', { ascending: true });
      if (hero && hero.length > 0) {
        setHeroSlides(hero);
      } else {
        const defaultHero = [
          {
            id: '1',
            url: "https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&q=80&w=1920",
            title: "ইফতার মাহফিলে এস এস সি ব্যাচ ২০১৯",
            subtitle: "নকলা সরকারি পাইলট উচ্চ বিদ্যালয়"
          },
          {
            id: '2',
            url: "https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&q=80&w=1920",
            title: "স্মৃতির আঙিনায় মিলনমেলা",
            subtitle: "এস এস সি ব্যাচ ২০১৯"
          }
        ];
        setHeroSlides(defaultHero);
      }

      // Fetch event date from settings
      const { data: settings } = await supabase.from('settings').select('*').eq('key', 'event_date').single();
      if (settings) setEventDate(settings.value);

      // Fetch gallery
      const { data: gallery } = await supabase.from('gallery').select('*').order('created_at', { ascending: false });
      if (gallery) setGalleryImages(gallery);
    };

    loadData();

    // Set up real-time subscriptions
    const regsSubscription = supabase.channel('registrations_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, loadData)
      .subscribe();
    
    const gallerySubscription = supabase.channel('gallery_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, loadData)
      .subscribe();

    const heroSubscription = supabase.channel('hero_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hero' }, loadData)
      .subscribe();

    const settingsSubscription = supabase.channel('settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(regsSubscription);
      supabase.removeChannel(gallerySubscription);
      supabase.removeChannel(heroSubscription);
      supabase.removeChannel(settingsSubscription);
    };
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !photo) {
      setMessage({ type: 'error', text: 'আপনার নাম, ফোন নাম্বার এবং ছবি প্রদান করুন।' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(photo);
      reader.onload = async () => {
        const base64Image = reader.result as string;
        const compressedImage = await compressImage(base64Image, 200, 200);
        
        const { error } = await supabase.from('registrations').insert([
          {
            name,
            phone,
            photo_url: compressedImage,
            is_approved: false,
            created_at: new Date().toISOString()
          }
        ]);

        if (error) throw error;

        // Sync to Google Sheets
        await syncToGoogleSheets({
          name,
          phone,
          status: 'Pending',
          timestamp: new Date().toLocaleString(),
          action: 'insert'
        });

        setMessage({ type: 'success', text: 'রেজিষ্ট্রেশন সফল হয়েছে! এডমিন অনুমোদনের জন্য অপেক্ষা করুন।' });
        setName('');
        setPhone('');
        setPhoto(null);
        setPhotoPreview(null);
        setLoading(false);
      };
    } catch (error: any) {
      console.error('Supabase error:', error);
      setMessage({ type: 'error', text: 'কিছু ভুল হয়েছে, আবার চেষ্টা করুন।' });
      setLoading(false);
    }
  };

  const approvedGuests = registrations
    .filter(r => r.is_approved)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <div className="marquee-container sticky top-0 z-50">
        <div className="marquee-content text-gold-light font-medium">
          ✨ ইফতার মাহফিল ২০২৬ - এস এস সি ব্যাচ ২০১৯, নকলা সরকারি পাইলট উচ্চ বিদ্যালয় ✨ রেজিষ্ট্রেশন চলছে... ✨ স্থান: স্কুল প্রাঙ্গণ ✨ তারিখ: {eventDate} ✨ Developed by Asif Sharker ✨
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-emerald-950/40 backdrop-blur-md border-b border-white/5 py-4 px-6 flex justify-between items-center relative z-40">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold tracking-tighter text-gold">এস এস সি ব্যাচ ২০১৯</h2>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/admin" className="text-gold hover:text-white transition-colors">
            <Settings size={20} />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-[70vh] md:h-[90vh]">
        <Swiper
          modules={[Autoplay, Pagination, Navigation]}
          autoplay={{ delay: 6000 }}
          pagination={{ clickable: true }}
          navigation
          className="h-full w-full"
        >
          {heroSlides.map((slide) => (
            <SwiperSlide key={slide.id}>
              <div className="h-full w-full bg-cover bg-center relative" style={{ backgroundImage: `url(${slide.url})` }}>
                <div className="absolute inset-0 bg-linear-to-t from-emerald-950 via-emerald-950/40 to-transparent flex items-center justify-center text-center px-4">
                  <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} className="max-w-4xl">
                    <h1 className="text-4xl md:text-8xl font-bold text-white mb-6 drop-shadow-2xl hero-text-outline">{slide.title}</h1>
                    <p className="text-xl md:text-3xl text-white mb-10 font-light tracking-wide hero-text-outline">{slide.subtitle}</p>
                    <a href="#register" className="btn-gold">রেজিষ্ট্রেশন করুন</a>
                  </motion.div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

      {/* Registration Form */}
      <section id="register" className="py-20 px-4 overflow-hidden">
        <div className="container mx-auto max-w-2xl">
          <h2 className="section-title py-4">রেজিষ্ট্রেশন ফর্ম</h2>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} className="glass-card p-8 md:p-12">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-gold-light mb-2 text-sm uppercase tracking-widest">আপনার নাম</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/50 w-5 h-5" />
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="পুরো নাম লিখুন" className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-gold text-white" required />
                </div>
              </div>
              <div>
                <label className="block text-gold-light mb-2 text-sm uppercase tracking-widest">ফোন নাম্বার</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/50 w-5 h-5" />
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="আপনার ফোন নাম্বার দিন" className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-gold text-white" required />
                </div>
              </div>
              <div>
                <label className="block text-gold-light mb-2 text-sm uppercase tracking-widest">প্রোফাইল ছবি</label>
                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-gold/50 transition-all bg-white/5 group">
                  <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" className="hidden" />
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-32 h-32 rounded-full object-cover border-4 border-gold mx-auto" />
                  ) : (
                    <div className="space-y-3">
                      <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto"><Upload className="text-gold w-8 h-8" /></div>
                      <p className="text-white/60">ছবি আপলোড করতে ক্লিক করুন</p>
                    </div>
                  )}
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full btn-gold flex items-center justify-center gap-2">
                {loading ? <Loader2 className="animate-spin" /> : 'সাবমিট করুন'}
              </button>
              <AnimatePresence>
                {message && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cn("p-4 rounded-xl text-center text-sm", message.type === 'success' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30")}>
                    {message.text}
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Guest Grid */}
      <section className="py-20 bg-emerald-950/50 overflow-hidden">
        <div className="container mx-auto px-4">
          <h2 className="section-title py-4 !text-[26px] md:!text-6xl">অংশগ্রহণকারী সদস্যবৃন্দ ({approvedGuests.length})</h2>
          {approvedGuests.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 md:gap-6">
              {approvedGuests.map((guest, idx) => (
                <motion.div 
                  key={guest.id} 
                  initial={{ opacity: 0, y: 20 }} 
                  whileInView={{ opacity: 1, y: 0 }} 
                  transition={{ delay: idx * 0.05 }}
                  className="glass-card overflow-hidden group border-gold/10"
                >
                  <div 
                    className="aspect-square overflow-hidden cursor-pointer" 
                    onClick={() => setLightboxData({ images: approvedGuests.map(g => g.photo_url), index: idx })}
                  >
                    <img src={guest.photo_url} alt={guest.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  </div>
                  <div className="p-3 text-center bg-black/40">
                    <h3 className="text-white text-[16px] font-bold truncate mb-0.5">{guest.name}</h3>
                    <p className="text-gold text-[14px] uppercase tracking-widest font-medium mb-0.5">SSC Batch 2019</p>
                    <p 
                      className="text-white/60 text-[13px] font-mono cursor-pointer hover:text-gold transition-colors flex items-center justify-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(guest.phone);
                        alert('ফোন নাম্বার কপি করা হয়েছে: ' + guest.phone);
                      }}
                      title="কপি করতে ক্লিক করুন"
                    >
                      {guest.phone}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 glass-card">
              <ImageIcon className="w-16 h-16 text-gold/20 mx-auto mb-4" />
              <p className="text-white/40">এখনও কোনো সদস্য অনুমোদিত হয়নি।</p>
            </div>
          )}
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-20 px-4 overflow-hidden">
        <div className="container mx-auto">
          <h2 className="section-title py-4">ইভেন্ট গ্যালারি</h2>
          {galleryImages.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {galleryImages.map((img, idx) => (
                <motion.div 
                  key={img.id} 
                  initial={{ opacity: 0 }} 
                  whileInView={{ opacity: 1 }} 
                  className="gallery-item"
                  onClick={() => setLightboxData({ images: galleryImages.map(i => i.url), index: idx })}
                >
                  <img src={img.url} alt="Gallery" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Plus className="text-gold w-8 h-8" />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="glass-card p-12 text-center">
              <h3 className="text-2xl font-bold text-gold mb-4">Coming Soon</h3>
              <p className="text-white/60 max-w-md mx-auto">ইফতার মাহফিলের পর এখানে সকল স্মরণীয় মুহূর্তগুলো আপলোড করা হবে।</p>
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxData && (
          <Lightbox 
            images={lightboxData.images} 
            initialIndex={lightboxData.index} 
            onClose={() => setLightboxData(null)} 
          />
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-emerald-950 pt-20 pb-10 border-t border-gold/20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
            <div>
              <h4 className="text-gold font-bold text-xl mb-6">Quick Links</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-white/60 hover:text-gold transition-colors flex items-center gap-2"><ChevronRight size={14} /> Home</a></li>
                <li><a href="#register" className="text-white/60 hover:text-gold transition-colors flex items-center gap-2"><ChevronRight size={14} /> Registration</a></li>
                <li><a href="https://asifsharker.com/" target="_blank" className="text-white/60 hover:text-gold transition-colors flex items-center gap-2"><ChevronRight size={14} /> Developer Website</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gold font-bold text-xl mb-6">Contact Info</h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-white/60"><MapPin className="text-gold shrink-0" size={20} /> <span>Nakla Government Pilot High School, Nakla, Sherpur</span></li>
                <li className="flex items-center gap-3 text-white/60"><Phone className="text-gold shrink-0" size={20} /> <span>০১৭৬৮৭০৫৫৯৩</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gold font-bold text-xl mb-6">Social Media</h4>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:bg-gold hover:text-emerald-900 transition-all border border-white/10"><Facebook size={20} /></a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:bg-gold hover:text-emerald-900 transition-all border border-white/10"><Instagram size={20} /></a>
              </div>
            </div>
          </div>
          <div className="text-center text-white/30 text-sm border-t border-white/5 pt-8 space-y-2">
            <p>© 202৬ SSC Batch 2019, Nakla Govt. Pilot High School.</p>
            <p className="text-xs">Developed by <a href="https://asifsharker.com/" target="_blank" className="text-gold hover:underline">Asif Sharker</a></p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// --- Admin Dashboard Page ---

const AdminDashboard = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isAdminLoggedIn') === 'true');
  const [password, setPassword] = useState('');
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [eventDate, setEventDate] = useState('২৭শে রমজান');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'gallery' | 'hero' | 'settings'>('users');
  const [uploading, setUploading] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [replacingMemberId, setReplacingMemberId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const navigate = useNavigate();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const memberPhotoInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      // Fetch registrations
      const { data: regs } = await supabase.from('registrations').select('*').order('created_at', { ascending: false });
      if (regs) setRegistrations(regs);

      // Fetch gallery
      const { data: gallery } = await supabase.from('gallery').select('*').order('created_at', { ascending: false });
      if (gallery) setGalleryImages(gallery);

      // Fetch hero slides
      const { data: hero } = await supabase.from('hero').select('*').order('id', { ascending: true });
      if (hero) setHeroSlides(hero);

      // Fetch event date from settings
      const { data: settings } = await supabase.from('settings').select('*').eq('key', 'event_date').single();
      if (settings) setEventDate(settings.value);
      
      setIsDataLoaded(true);
    };

    // One-time sync from localStorage to Supabase for data recovery
    const syncLocalData = async () => {
      const localRegs = localStorage.getItem('batch2019_registrations');
      const synced = localStorage.getItem('supabase_synced');
      
      if (localRegs && !synced) {
        try {
          const regs = JSON.parse(localRegs);
          if (Array.isArray(regs) && regs.length > 0) {
            for (const reg of regs) {
              await supabase.from('registrations').insert([{
                name: reg.name,
                phone: reg.phone,
                photo_url: reg.photo_url,
                is_approved: reg.is_approved,
                created_at: reg.created_at || new Date().toISOString()
              }]);
            }
          }
          localStorage.setItem('supabase_synced', 'true');
          loadData();
        } catch (e) {
          console.error('Sync error:', e);
        }
      }
    };

    syncLocalData();
    loadData();

    // Set up real-time subscriptions
    const regsSubscription = supabase.channel('admin_regs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, loadData)
      .subscribe();
    
    const gallerySubscription = supabase.channel('admin_gallery_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, loadData)
      .subscribe();

    const heroSubscription = supabase.channel('admin_hero_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hero' }, loadData)
      .subscribe();

    const settingsSubscription = supabase.channel('admin_settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(regsSubscription);
      supabase.removeChannel(gallerySubscription);
      supabase.removeChannel(heroSubscription);
      supabase.removeChannel(settingsSubscription);
    };
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPass = import.meta.env.VITE_ADMIN_PASSWORD || 'asif000';
    if (password === correctPass) {
      setIsLoggedIn(true);
      localStorage.setItem('isAdminLoggedIn', 'true');
    }
    else alert('ভুল পাসওয়ার্ড!');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('isAdminLoggedIn');
  };

  const updateEventDate = async (date: string) => {
    const { error } = await supabase.from('settings').upsert({ key: 'event_date', value: date }, { onConflict: 'key' });
    if (!error) setEventDate(date);
  };

  const toggleApproval = async (id: string) => {
    const reg = registrations.find(r => r.id === id);
    if (!reg) return;
    
    const { error } = await supabase
      .from('registrations')
      .update({ is_approved: !reg.is_approved })
      .eq('id', id);
      
    if (!error) {
      const newStatus = !reg.is_approved;
      setRegistrations(prev => prev.map(r => r.id === id ? { ...r, is_approved: newStatus } : r));

      // Sync status update to Google Sheets
      await syncToGoogleSheets({
        name: reg.name,
        phone: reg.phone,
        status: newStatus ? 'Approved' : 'Pending',
        timestamp: new Date().toLocaleString(),
        action: 'update'
      });
    }
  };

  const deleteEntry = async (id: string) => {
    if (window.confirm('আপনি কি নিশ্চিত যে আপনি এই মেম্বারকে ডিলিট করতে চান?')) {
      const { error } = await supabase.from('registrations').delete().eq('id', id);
      if (!error) {
        setRegistrations(prev => prev.filter(r => r.id !== id));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    }
  };

  const handleMemberPhotoUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && replacingMemberId) {
      setUploading(true);
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Image = reader.result as string;
        const compressedImage = await compressImage(base64Image, 200, 200);
        
        const { error } = await supabase
          .from('registrations')
          .update({ photo_url: compressedImage })
          .eq('id', replacingMemberId);

        if (!error) {
          setRegistrations(prev => prev.map(r => r.id === replacingMemberId ? { ...r, photo_url: compressedImage } : r));
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
        }
        
        setReplacingMemberId(null);
        setUploading(false);
      };
    }
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploading(true);
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Image = reader.result as string;
        const compressedImage = await compressImage(base64Image, 1200, 1200);
        
        const { data, error } = await supabase.from('gallery').insert([
          {
            url: compressedImage,
            created_at: new Date().toISOString()
          }
        ]).select();

        if (!error && data) {
          setGalleryImages(prev => [data[0], ...prev]);
        }
        
        setUploading(false);
      };
    }
  };

  const handleHeroUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploading(true);
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Image = reader.result as string;
        const compressedImage = await compressImage(base64Image, 1280, 720);
        
        if (replacingId) {
          const { error } = await supabase.from('hero').update({ url: compressedImage }).eq('id', replacingId);
          if (!error) {
            setHeroSlides(prev => prev.map(s => s.id === replacingId ? { ...s, url: compressedImage } : s));
            setReplacingId(null);
          }
        } else {
          const { data, error } = await supabase.from('hero').insert([
            {
              url: compressedImage,
              title: "নতুন স্লাইড",
              subtitle: "এস এস সি ব্যাচ ২০১৯"
            }
          ]).select();
          
          if (!error && data) {
            setHeroSlides(prev => [...prev, data[0]]);
          }
        }
        setUploading(false);
      };
    }
  };

  const saveHeroChanges = async () => {
    setUploading(true);
    try {
      for (const slide of heroSlides) {
        const { error } = await supabase
          .from('hero')
          .update({ title: slide.title, subtitle: slide.subtitle })
          .eq('id', slide.id);
        if (error) throw error;
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving hero changes:', error);
      alert('স্লাইড সেভ করতে সমস্যা হয়েছে!');
    } finally {
      setUploading(false);
    }
  };

  const deleteGalleryImage = async (id: string) => {
    if (window.confirm('ছবিটি মুছে ফেলতে চান?')) {
      const { error } = await supabase.from('gallery').delete().eq('id', id);
      if (!error) {
        setGalleryImages(prev => prev.filter(img => img.id !== id));
      }
    }
  };

  const deleteHeroSlide = async (id: string) => {
    if (window.confirm('স্লাইডটি মুছে ফেলতে চান?')) {
      const { error } = await supabase.from('hero').delete().eq('id', id);
      if (!error) {
        setHeroSlides(prev => prev.filter(slide => slide.id !== id));
      }
    }
  };

  const downloadPDF = () => {
    const approved = registrations.filter(r => r.is_approved);
    if (approved.length === 0) {
      alert('কোনো অনুমোদিত মেম্বার নেই!');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Member List - SSC Batch 2019</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;700&display=swap');
            body { font-family: 'Hind Siliguri', sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #D4AF37; padding-bottom: 20px; margin-bottom: 30px; }
            h1 { color: #004d40; margin: 0; font-size: 28px; }
            .subtitle { color: #666; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f8f8f8; color: #004d40; font-weight: bold; }
            tr:nth-child(even) { background-color: #fafafa; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; pt-20; }
            .stats { margin-bottom: 10px; font-weight: bold; color: #D4AF37; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ইফতার মাহফিল ২০২৬ - অনুমোদিত মেম্বার লিস্ট</h1>
            <div class="subtitle">এস এস সি ব্যাচ ২০১৯, নকলা সরকারি পাইলট উচ্চ বিদ্যালয়</div>
          </div>
          <div class="stats">মোট অনুমোদিত সদস্য: ${approved.length} জন</div>
          <table>
            <thead>
              <tr>
                <th style="width: 50px;">ক্রমিক</th>
                <th>নাম</th>
                <th>ফোন নাম্বার</th>
                <th>স্ট্যাটাস</th>
              </tr>
            </thead>
            <tbody>
              ${approved.map((reg, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td style="font-weight: 500;">${reg.name}</td>
                  <td>${reg.phone}</td>
                  <td style="color: green;">Approved</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            রিপোর্ট তৈরির সময়: ${new Date().toLocaleString('bn-BD')} | Developed by Asif Sharker
          </div>
          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const filteredRegs = registrations.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-emerald-950 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-8 max-w-sm w-full">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center"><Settings className="text-gold w-8 h-8" /></div>
          </div>
          <h2 className="text-2xl font-bold text-gold text-center mb-8">Admin Access</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="পাসওয়ার্ড দিন" className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white focus:border-gold outline-none" autoFocus />
            <button type="submit" className="w-full btn-gold">লগইন করুন</button>
            <Link to="/" className="block text-center text-white/40 hover:text-white text-sm mt-4">ফিরে যান</Link>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-950 flex flex-col">
      {/* Admin Nav */}
      <nav className="bg-emerald-900 border-b border-gold/20 py-4 px-6 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="text-gold" />
          <h1 className="text-xl font-bold text-gold">Admin Panel</h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.location.reload()}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gold transition-colors"
            title="Refresh Data"
          >
            <RefreshCw size={18} />
          </button>
          <button onClick={handleLogout} className="text-white/60 hover:text-red-400 transition-colors flex items-center gap-2">
            <LogOut size={18} /> Logout
          </button>
          <Link to="/" className="text-gold hover:text-white transition-colors"><ChevronLeft size={24} /></Link>
        </div>
      </nav>

      <div className="flex-1 container mx-auto p-4 md:p-8">
        {/* Tabs */}
        <div className="flex flex-wrap gap-3 mb-8">
          {[
            { id: 'users', label: 'মেম্বার লিস্ট', icon: Users },
            { id: 'gallery', label: 'গ্যালারি', icon: Camera },
            { id: 'hero', label: 'হিরো স্লাইডার', icon: ImageIcon },
            { id: 'settings', label: 'সেটিংস', icon: Settings },
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)} 
              className={cn(
                "px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 border",
                activeTab === tab.id 
                  ? "bg-gold text-emerald-950 border-gold shadow-lg shadow-gold/20" 
                  : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
              )}
            >
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'users' && (
          <div className="space-y-6">
            <input 
              type="file" 
              ref={memberPhotoInputRef} 
              onChange={handleMemberPhotoUpdate} 
              accept="image/*" 
              className="hidden" 
            />
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="নাম দিয়ে খুঁজুন..." className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-gold outline-none" />
              </div>
              <div className="bg-gold/10 border border-gold/20 px-4 py-2 rounded-xl flex items-center gap-4">
                {saveSuccess && (
                  <motion.span initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="text-emerald-400 text-xs font-bold">
                    পরিবর্তন সেভ হয়েছে!
                  </motion.span>
                )}
                <button 
                  onClick={downloadPDF}
                  className="flex items-center gap-2 bg-gold text-emerald-950 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gold-light transition-all"
                >
                  <FileText size={14} /> PDF ডাউনলোড
                </button>
                <p className="text-gold text-sm font-bold">মোট মেম্বার: {registrations.length} জন</p>
              </div>
            </div>
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto max-h-[70vh] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-emerald-900/80 sticky top-0 z-10 backdrop-blur-md border-b border-white/10">
                    <tr>
                      <th className="p-4 text-gold-light text-xs uppercase tracking-widest">ফটো</th>
                      <th className="p-4 text-gold-light text-xs uppercase tracking-widest">নাম</th>
                      <th className="p-4 text-gold-light text-xs uppercase tracking-widest">ফোন</th>
                      <th className="p-4 text-gold-light text-xs uppercase tracking-widest">স্ট্যাটাস</th>
                      <th className="p-4 text-gold-light text-xs uppercase tracking-widest text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredRegs.length > 0 ? (
                      filteredRegs.map((reg) => (
                        <tr key={reg.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4">
                            <div className="relative group/photo w-12 h-12">
                              <img src={reg.photo_url} className="w-12 h-12 rounded-full object-cover border border-gold/30" />
                              <button 
                                onClick={() => {
                                  setReplacingMemberId(reg.id);
                                  memberPhotoInputRef.current?.click();
                                }}
                                className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity"
                                title="ছবি পরিবর্তন করুন"
                              >
                                <Upload size={14} className="text-white" />
                              </button>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-white">{reg.name}</div>
                          </td>
                          <td className="p-4">
                            <div className="text-xs text-white/40 font-mono">{reg.phone}</div>
                          </td>
                          <td className="p-4">
                            <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase", reg.is_approved ? "bg-emerald-500/20 text-emerald-400" : "bg-yellow-500/20 text-yellow-400")}>
                              {reg.is_approved ? 'Approved' : 'Pending'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-3">
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleApproval(reg.id);
                                }} 
                                title={reg.is_approved ? "Unapprove" : "Approve"}
                                className={cn("p-2.5 rounded-lg transition-all hover:scale-110 active:scale-95", reg.is_approved ? "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500 hover:text-white" : "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white")}
                              >
                                <CheckCircle size={18} />
                              </button>
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteEntry(reg.id);
                                }} 
                                title="Delete Member"
                                className="p-2.5 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all hover:scale-110 active:scale-95"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-white/40">
                          কোনো মেম্বার পাওয়া যায়নি।
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'gallery' && (
          <div className="space-y-8">
            <div className="glass-card p-8 border-dashed border-2 border-gold/20 text-center">
              <input type="file" ref={galleryInputRef} onChange={handleGalleryUpload} accept="image/*" className="hidden" />
              <button onClick={() => galleryInputRef.current?.click()} disabled={uploading} className="btn-gold flex items-center gap-2 mx-auto">
                {uploading ? <Loader2 className="animate-spin" /> : <Plus />} গ্যালারিতে ছবি যোগ করুন
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {galleryImages.map((img) => (
                <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden border border-white/10">
                  <img src={img.url} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={() => deleteGalleryImage(img.id)} className="p-2 bg-red-500 text-white rounded-full hover:scale-110 transition-transform">
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'hero' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gold">হিরো স্লাইডার ম্যানেজমেন্ট</h3>
              <div className="flex gap-4">
                <button 
                  onClick={saveHeroChanges} 
                  className="btn-gold !py-2 !px-6 flex items-center gap-2"
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} সেভ চেঞ্জ
                </button>
              </div>
            </div>

            {saveSuccess && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="bg-emerald-500/20 text-emerald-400 p-4 rounded-xl border border-emerald-500/30 text-center font-bold"
              >
                সফলভাবে সেভ করা হয়েছে!
              </motion.div>
            )}

            <div className="glass-card p-8 border-dashed border-2 border-gold/20 text-center">
              <input type="file" ref={heroInputRef} onChange={handleHeroUpload} accept="image/*" className="hidden" />
              <button onClick={() => heroInputRef.current?.click()} disabled={uploading} className="btn-gold flex items-center gap-2 mx-auto">
                {uploading ? <Loader2 className="animate-spin" /> : <Plus />} স্লাইডার ইমেজ যোগ করুন
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {heroSlides.map((slide) => (
                <div key={slide.id} className="glass-card overflow-hidden group">
                  <div className="aspect-video relative">
                    <img src={slide.url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-4">
                      <button 
                        onClick={() => {
                          setReplacingId(slide.id);
                          heroInputRef.current?.click();
                        }} 
                        className="p-3 bg-gold text-emerald-900 rounded-full hover:scale-110 transition-transform"
                        title="ছবি পরিবর্তন করুন"
                      >
                        <Upload size={24} />
                      </button>
                      <button onClick={() => deleteHeroSlide(slide.id)} className="p-3 bg-red-500 text-white rounded-full hover:scale-110 transition-transform" title="ডিলিট করুন">
                        <Trash2 size={24} />
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <input 
                      type="text" 
                      value={slide.title} 
                      onChange={(e) => {
                        const updated = heroSlides.map(s => s.id === slide.id ? { ...s, title: e.target.value } : s);
                        setHeroSlides(updated); // Update state only, don't save to local yet
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-gold font-bold mb-2 outline-none focus:border-gold"
                    />
                    <input 
                      type="text" 
                      value={slide.subtitle} 
                      onChange={(e) => {
                        const updated = heroSlides.map(s => s.id === slide.id ? { ...s, subtitle: e.target.value } : s);
                        setHeroSlides(updated); // Update state only, don't save to local yet
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white/60 text-sm outline-none focus:border-gold"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-md mx-auto space-y-8">
            <div className="glass-card p-8">
              <h3 className="text-xl font-bold text-gold mb-6">ইভেন্ট সেটিংস</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-white/60 text-sm mb-2">ইভেন্ট তারিখ</label>
                  <input 
                    type="text" 
                    value={eventDate} 
                    onChange={(e) => updateEventDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-gold"
                    placeholder="উদা: ২৭শে রমজান"
                  />
                </div>
                <p className="text-xs text-white/40 italic">* এটি পরিবর্তন করলে মেইন সাইটের টপ বার এবং অন্যান্য জায়গায় আপডেট হবে।</p>
              </div>
            </div>
            
            <div className="glass-card p-8 border-red-500/20">
              <h3 className="text-xl font-bold text-red-400 mb-6">Danger Zone</h3>
              <button 
                onClick={async () => {
                  if (confirm('আপনি কি নিশ্চিত যে আপনি সকল ডাটা মুছে ফেলতে চান? এটি আর ফিরে পাওয়া যাবে না।')) {
                    setUploading(true);
                    try {
                      await supabase.from('registrations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                      await supabase.from('gallery').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                      alert('সকল ডাটা মুছে ফেলা হয়েছে।');
                      window.location.reload();
                    } catch (e) {
                      alert('ডাটা মুছতে সমস্যা হয়েছে।');
                    } finally {
                      setUploading(false);
                    }
                  }
                }}
                className="w-full py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all font-bold flex items-center justify-center gap-2"
              >
                {uploading ? <Loader2 className="animate-spin" /> : <Trash2 size={18} />} Reset All Data
              </button>
              <p className="text-xs text-white/20 mt-4 text-center">* এটি শুধুমাত্র রেজিস্ট্রেশন এবং গ্যালারি ডাটা মুছবে।</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}
