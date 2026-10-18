// The question bank for Packet Check, the /play quiz. Two decks: everyday
// networking (Neil's major) and security awareness, in the plain-language
// spirit of his Cyber Awareness Series for the CLSU Department of IT.
//
// Each card has one correct answer, three wrong ones and a one- or
// two-sentence explanation shown after the player answers. Level 1 cards
// are for complete beginners; level 2 cards assume a little background.
// Keep every fact checkable and every explanation short.

export type QuizCategory = "networks" | "security";

export interface BankCard {
  id: string;
  category: QuizCategory;
  level: 1 | 2;
  /** A word or two for the packet on the diagram, like "DNS" */
  tag: string;
  prompt: string;
  answer: string;
  wrong: [string, string, string];
  why: string;
}

const net = (id: string, level: 1 | 2, tag: string, prompt: string, answer: string, wrong: [string, string, string], why: string): BankCard => ({
  id: `net-${id}`,
  category: "networks",
  level,
  tag,
  prompt,
  answer,
  wrong,
  why,
});

const sec = (id: string, level: 1 | 2, tag: string, prompt: string, answer: string, wrong: [string, string, string], why: string): BankCard => ({
  id: `sec-${id}`,
  category: "security",
  level,
  tag,
  prompt,
  answer,
  wrong,
  why,
});

export const NETWORK_CARDS: BankCard[] = [
  net("ip", 1, "IP", "What is an IP address?", "A number that identifies a device on a network", ["A Wi-Fi password", "The name of a website", "A type of network cable"], "Like a mailing address, it tells packets which device to reach."),
  net("router", 1, "Router", "What does a router do?", "Forwards traffic between different networks", ["Stores copies of websites", "Encrypts the files on your laptop", "Charges devices over the cable"], "A router links networks, such as your home network and your ISP's, and picks where each packet goes next."),
  net("switch", 1, "Switch", "What does a network switch do?", "Connects devices on the same local network", ["Gives your home a public IP address", "Turns website names into addresses", "Removes viruses from traffic"], "A switch passes traffic between devices on one LAN, using their MAC addresses to find the right port."),
  net("dns", 1, "DNS", "What does DNS do?", "Turns names like example.com into IP addresses", ["Hands out IP addresses to new devices", "Encrypts web traffic", "Boosts your Wi-Fi signal"], "DNS is the internet's phone book: it looks up the IP address behind a domain name."),
  net("dhcp", 1, "DHCP", "What does DHCP do?", "Gives devices an IP address automatically", ["Turns names into IP addresses", "Blocks unwanted traffic", "Measures your internet speed"], "When a device joins, DHCP leases it an address, subnet mask, gateway and DNS server."),
  net("443", 1, ":443", "Which service uses port 443?", "HTTPS", ["HTTP", "SSH", "DNS"], "Encrypted web traffic, HTTPS, uses TCP port 443."),
  net("80", 1, ":80", "Which service uses port 80?", "HTTP", ["HTTPS", "SMTP", "SSH"], "Plain, unencrypted web traffic uses port 80."),
  net("22", 1, ":22", "Which service listens on port 22?", "SSH", ["Telnet", "HTTP", "Remote Desktop"], "SSH, the encrypted remote command line, uses port 22."),
  net("53", 1, ":53", "Which service uses port 53?", "DNS", ["DHCP", "HTTPS", "FTP"], "DNS lookups go to port 53, usually over UDP."),
  net("private-ip", 1, "Private", "Which of these is a private IP address?", "192.168.1.10", ["8.8.8.8", "1.1.1.1", "52.84.10.3"], "192.168.0.0/16 is reserved for private networks. The others are public addresses on the internet."),
  net("loopback", 1, "127.0.0.1", "What is 127.0.0.1?", "Your own device, the loopback address", ["Your home router", "A public DNS server", "The first phone that joined the Wi-Fi"], "Traffic sent to 127.0.0.1 never leaves your machine. It is handy for testing."),
  net("bands", 1, "Wi-Fi", "Compared with 2.4 GHz, 5 GHz Wi-Fi is usually…", "Faster, with shorter range", ["Slower, with longer range", "Faster, with longer range", "Exactly the same"], "5 GHz has wider, less crowded channels, so it is usually faster, but it fades sooner through walls."),
  net("walls", 1, "2.4 GHz", "Which Wi-Fi band usually reaches the far bedroom best?", "2.4 GHz", ["5 GHz", "6 GHz", "They all reach equally far"], "Lower frequencies pass through walls and floors better, at lower speeds."),
  net("ssid", 1, "SSID", "What is an SSID?", "The name of a Wi-Fi network", ["The Wi-Fi password", "The router's serial number", "Your internet speed"], "The SSID is the network name you pick from the Wi-Fi list."),
  net("mac", 1, "MAC", "What is a MAC address?", "A hardware ID for a network interface", ["An IP address for Apple devices", "A Wi-Fi password", "A type of malware"], "A MAC address is a 48-bit identifier used to deliver frames on the local network."),
  net("lan", 1, "LAN", "What is a LAN?", "A network in one place, like a home or office", ["The whole internet", "A cable that carries power", "A kind of Wi-Fi password"], "LAN stands for Local Area Network: devices close together, sharing one network."),
  net("gateway", 1, "Gateway", "What is a default gateway?", "The router your device uses to reach other networks", ["The fastest website you visit", "The Wi-Fi password", "The first device to join the network"], "Anything outside your own subnet is sent to the default gateway, usually your router."),
  net("ping", 1, "ping", "What does the ping command check?", "Whether a host is reachable, and how quickly it replies", ["Which files are on a server", "Your Wi-Fi password", "Whether a website is safe"], "ping sends small echo requests and times the replies."),
  net("ipv4-bits", 1, "IPv4", "How many bits are in an IPv4 address?", "32", ["64", "128", "16"], "Four octets of 8 bits each: 32 bits, written like 192.168.1.10."),
  net("rj45", 1, "Cable", "Which connector does a typical Ethernet cable use?", "RJ45", ["RJ11", "HDMI", "USB-C"], "Ethernet uses the 8-pin RJ45 plug. RJ11 is the smaller telephone plug."),
  net("modem", 1, "Modem", "Which device connects your home to the ISP's line?", "A modem, or an ONT on fibre", ["A switch", "A printer", "A Wi-Fi extender"], "The modem talks to the provider's line. The router then shares that connection with your devices."),
  net("mbps", 1, "Mbps", "A plan advertised at 100 Mbps means…", "100 megabits per second", ["100 megabytes per second", "100 devices at once", "100 GB of data per month"], "A lowercase b means bits. 100 Mbps is about 12.5 megabytes per second."),
  net("latency", 1, "Latency", "What does latency measure?", "How long data takes to make the trip", ["How much data fits through each second", "Wi-Fi signal strength", "How many devices are connected"], "Latency is delay, measured in milliseconds. Bandwidth is capacity."),
  net("star", 1, "Star", "In a star topology, every device connects to…", "A central switch", ["Its two neighbours in a ring", "Every other device directly", "A satellite"], "Most home and office networks are stars: each device has its own link to a switch or router."),
  net("ipv6-bits", 2, "IPv6", "How long is an IPv6 address?", "128 bits", ["32 bits", "64 bits", "48 bits"], "IPv6 uses 128 bits, written as eight groups of four hex digits."),
  net("tcp", 2, "TCP", "Which protocol makes sure data arrives complete and in order?", "TCP", ["UDP", "ICMP", "ARP"], "TCP acknowledges and resends lost data. UDP just sends, which suits live calls and games."),
  net("nat", 2, "NAT", "What does NAT do on a home router?", "Lets many private devices share one public IP", ["Encrypts your Wi-Fi", "Speeds up DNS lookups", "Assigns MAC addresses"], "The router swaps private addresses for its public one on the way out, and back on the way in."),
  net("apipa", 2, "169.254", "A laptop shows an IP starting with 169.254. What happened?", "It couldn't reach a DHCP server", ["It has a public IP address", "It joined the 5 GHz band", "It is using the loopback address"], "169.254.0.0/16 is link-local: devices give themselves one when DHCP doesn't answer."),
  net("osi-router", 2, "Layer 3", "Routers mainly work at which OSI layer?", "Layer 3, Network", ["Layer 1, Physical", "Layer 2, Data link", "Layer 7, Application"], "Routers forward by IP address at Layer 3. Switches forward by MAC address at Layer 2."),
  net("vlan", 2, "VLAN", "What does a VLAN let you do?", "Split one switch into separate logical networks", ["Extend your Wi-Fi range", "Encrypt email", "Get a faster ISP plan"], "VLANs keep groups apart, such as staff and guests, on the same physical switches."),
  net("icmp", 2, "ICMP", "Which protocol does ping use?", "ICMP", ["FTP", "SMTP", "DHCP"], "ping sends ICMP echo requests and waits for echo replies."),
  net("wifi6", 2, "802.11", "Wi-Fi 6 is the friendly name for which standard?", "802.11ax", ["802.11n", "802.11ac", "802.3"], "Wi-Fi 4 is 802.11n, Wi-Fi 5 is 802.11ac and Wi-Fi 6 is 802.11ax. 802.3 is wired Ethernet."),
  net("21", 2, ":21", "FTP, the classic file transfer protocol, uses which port?", "21", ["23", "110", "143"], "FTP's control channel is port 21. It sends passwords unencrypted, so SFTP is the safer choice."),
  net("25", 2, ":25", "Mail servers pass email to each other with SMTP on which port?", "25", ["110", "143", "443"], "SMTP relays mail on port 25. POP3 (110) and IMAP (143) are for reading it."),
  net("3389", 2, ":3389", "Which port does Windows Remote Desktop use by default?", "3389", ["22", "443", "8080"], "RDP listens on 3389, which is why attackers scan the internet for it."),
  net("rfc1918", 2, "10/8", "Which block is reserved for private networks?", "10.0.0.0/8", ["11.0.0.0/8", "20.0.0.0/8", "128.0.0.0/8"], "The private ranges are 10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16."),
  net("172", 2, "172.x", "Which address is inside the private 172.16.0.0/12 range?", "172.20.5.1", ["172.32.0.1", "172.15.9.9", "172.200.1.1"], "172.16.0.0/12 runs from 172.16.0.0 to 172.31.255.255."),
  net("arp", 2, "ARP", "What does ARP do on a local network?", "Finds the MAC address that owns an IP address", ["Assigns IP addresses", "Translates domain names", "Encrypts frames"], "Before sending on a LAN, a device asks: who has this IP? The owner replies with its MAC address."),
];

export const SECURITY_CARDS: BankCard[] = [
  sec("phishing", 1, "Phishing", "What is phishing?", "A fake message that tricks you into giving something away", ["A type of fast Wi-Fi", "Backing up your phone", "A rule for strong passwords"], "Phishing pretends to be someone you trust to steal passwords, money or data."),
  sec("urgency", 1, "Red flag", "Which is a classic phishing red flag?", "Pressure to act now: your account closes in 24 hours", ["Your name spelled correctly", "An email sent during office hours", "A message you can read without clicking"], "Urgency rushes you past your own judgement. Slow down and check."),
  sec("bank-email", 1, "Bank?", "An email from your bank asks you to log in through its link. Best move?", "Skip the link and open the bank's app or site yourself", ["Reply to ask if it's real", "Click the link to check", "Forward it to friends for advice"], "Use a route you already trust. Replying or clicking talks to whoever sent it."),
  sec("hover", 1, "Links", "Before you click a link in an email, what should you check?", "The real address, by hovering or long-pressing", ["Whether the link text says Official", "Whether the email has a logo", "Nothing, if it looks professional"], "Link text can say anything. The real destination is what counts."),
  sec("lookalike", 1, "Domain", "Your bank's site is yourbank.com. Which link is really theirs?", "https://login.yourbank.com/account", ["https://yourbank.com.login-secure.net", "https://yourbank-login.com", "https://yourbamk.com"], "Read the domain just before the first single slash. Only the first ends in yourbank.com."),
  sec("short-links", 1, "Short link", "Why take care with shortened links?", "They hide where they really go", ["They are always malware", "They are illegal", "They slow down your Wi-Fi"], "Preview or expand a short link before you trust it."),
  sec("attachment", 1, "Attachment", "An unexpected invoice.zip arrives from a stranger. What should you do?", "Leave it closed and check with the sender another way", ["Open it to see what's inside", "Forward it to your team", "Unzip it on a work computer"], "Surprise attachments are one of the most common ways malware gets in."),
  sec("passphrase", 1, "Password", "Which of these is the strongest password?", "lantern-mango-orbit-cliff", ["P@ssw0rd!", "Neil2004", "qwerty123"], "Length beats symbols. Four random words are long, hard to guess and easy to remember."),
  sec("reuse", 1, "Reuse", "Why not use one password everywhere?", "One leak unlocks every account that shares it", ["Websites block repeated passwords", "It slows down your phone", "It uses up storage"], "Attackers try leaked email and password pairs on other sites. This is called credential stuffing."),
  sec("manager", 1, "Manager", "How does a password manager help?", "It creates and remembers a unique password for every site", ["It makes all your passwords the same", "It shares passwords with friends", "It turns off two-step login"], "You remember one strong master password. It remembers the rest, and only fills them on the real site."),
  sec("mfa", 1, "MFA", "What is multi-factor authentication?", "Proving it's you with something extra, like a code or key", ["Using two similar passwords", "Logging in on two devices at once", "Changing your password every month"], "If your password leaks, the attacker still needs your second factor."),
  sec("mfa-prompt", 1, "Prompt", "You get a login approval prompt you didn't ask for. What should you do?", "Deny it, then change your password", ["Approve it to make it stop", "Approve it once to see what happens", "Turn off your phone"], "An unexpected prompt can mean someone already has your password."),
  sec("padlock", 1, "HTTPS", "What does the padlock or HTTPS in your browser tell you?", "Your connection to the site is encrypted", ["The site is honest and safe", "The site has no viruses", "The government approved the site"], "HTTPS protects data in transit. Scam sites can have a padlock too, so still check the address."),
  sec("public-wifi", 1, "Wi-Fi", "On free public Wi-Fi, what's the safest habit?", "Keep sensitive logins for mobile data or a trusted VPN", ["Turn off your screen lock", "Share files with everyone nearby", "Join any network called Free WiFi"], "Open networks can be faked or watched. Do banking and work on a connection you trust."),
  sec("social", 1, "People", "What is social engineering?", "Manipulating people into breaking security", ["Building a social media app", "Designing a faster network", "A way to back up files"], "It targets trust, fear and helpfulness instead of software flaws."),
  sec("fake-it", 1, "Caller", "A caller says he's from IT and needs your password to fix your account. You…", "Refuse and report it; real IT never needs your password", ["Give it, since it's IT", "Give him half of it", "Email it to him instead"], "Administrators can reset an account without ever knowing your password."),
  sec("gift-cards", 1, "Gift cards", "Your boss texts from a new number asking you to buy gift cards urgently. This is…", "A scam: check with your boss on a number you know", ["Normal office procedure", "A team-building exercise", "A tax requirement"], "Gift cards are hard to trace, which is why scammers ask for them."),
  sec("updates", 1, "Updates", "Why install software updates promptly?", "They fix security holes attackers already know about", ["They only change the colours", "They make passwords unnecessary", "They delete your old files"], "Once a fix is public, attackers target the devices that haven't installed it."),
  sec("backup-321", 1, "3-2-1", "What does the 3-2-1 backup rule mean?", "3 copies, on 2 kinds of storage, 1 kept off-site", ["Back up every 3 days, twice, for 1 hour", "3 passwords, 2 emails, 1 phone", "3 USB drives in 1 drawer"], "If one copy fails or gets encrypted, another survives somewhere else."),
  sec("ransomware", 1, "Ransomware", "What does ransomware do?", "Locks or encrypts your files and demands payment", ["Shows a few extra ads", "Speeds up your computer", "Repairs damaged files"], "A recent backup kept offline lets you restore without paying."),
  sec("malware", 1, "Malware", "Which statement is true?", "Ransomware is one kind of malware", ["Malware is one kind of ransomware", "They are unrelated", "Only phones get malware"], "Malware means any malicious software. Ransomware, spyware and trojans are all types of it."),
  sec("trojan", 1, "Trojan", "A program that looks useful but hides something harmful is a…", "Trojan", ["Firewall", "Patch", "Cookie"], "Like the wooden horse, it gets you to let it in yourself."),
  sec("lock-screen", 1, "Phone", "What's the simplest protection if your phone gets lost?", "A screen lock with a PIN, password or fingerprint", ["A bright wallpaper", "Leaving Bluetooth on", "Saving passwords in your notes"], "A lock stops anyone from casually opening your email, chats and saved logins."),
  sec("firewall", 1, "Firewall", "What does a firewall do?", "Allows or blocks network traffic based on rules", ["Keeps the computer cool", "Backs up your files", "Finds lost devices"], "It sits between networks and decides which connections may pass."),
  sec("encryption", 1, "Encrypt", "What does encryption do to data?", "Scrambles it so only the right key can read it", ["Makes the file smaller", "Copies it to the cloud", "Deletes it after reading"], "Without the key, encrypted data looks like random noise."),
  sec("oversharing", 1, "Privacy", "Why not post a photo of your boarding pass or ID?", "Its codes and numbers can be used to hijack bookings or steal your identity", ["Photos lower your Wi-Fi speed", "Airlines delete posted tickets", "It uses too much storage"], "Barcodes hold your booking details. Share the view from the window instead."),
  sec("clicked", 1, "Oops", "You typed your password into a phishing page. What comes first?", "Change it, and anywhere you reused it, then report it", ["Do nothing and hope", "Delete the email so no one knows", "Restart your router"], "Speed matters. A quick change and an early report limit the damage."),
  sec("app-store", 1, "Apps", "Where is the safest place to install apps from?", "The official app store or the developer's own site", ["A link in a pop-up ad", "A file shared in a group chat", "Any site offering paid apps for free"], "Free copies of paid apps are a favourite way to hide malware."),
  sec("qr", 1, "QR code", "Before paying through a QR code in public, you should…", "Check the address it opens and that it isn't a sticker over the real code", ["Scan it fast before it changes", "Turn off your screen lock", "Enter your card on any page it opens"], "Scammers paste their own codes over real ones. The address shows where you really are."),
  sec("spoofing", 1, "From", "Can the sender name on an email be faked?", "Yes, easily, so check the actual address", ["No, email names are verified", "Only on phones", "Only if it has an attachment"], "The display name is just text. Look at the full address, and still be careful."),
  sec("hardware-key", 2, "Passkey", "Which sign-in method resists phishing best?", "A passkey or hardware security key", ["A code sent by SMS", "A code sent by email", "A security question"], "Passkeys and security keys check the site's real address, so they won't work on a fake one."),
  sec("evil-twin", 2, "Hotspot", "A fake hotspot named like the café's real Wi-Fi is called…", "An evil twin", ["A mesh node", "A repeater", "A guest network"], "It lures people in so the attacker can watch or tamper with their traffic."),
  sec("smishing", 2, "SMS", "Phishing by text message is called…", "Smishing", ["Vishing", "Whaling", "Tailgating"], "SMS plus phishing. Vishing is the voice-call version."),
  sec("vishing", 2, "Call", "Phishing over a phone call is called…", "Vishing", ["Smishing", "Pharming", "Spoofing"], "Voice phishing. The caller often fakes the number to look official."),
  sec("tailgating", 2, "Door", "Following someone through a secured door without badging in is…", "Tailgating", ["Phishing", "Patching", "Whaling"], "Physical security counts too. Everyone badges in for themselves."),
  sec("least-privilege", 2, "Access", "What is the principle of least privilege?", "Give each person only the access they need", ["Give everyone admin rights", "Use the cheapest software", "Share one account for the team"], "Less access means less damage when an account is stolen."),
  sec("brute-force", 2, "Guessing", "Trying password after password until one works is a…", "Brute-force attack", ["Phishing attack", "Backup", "Handshake"], "Long passphrases and lockouts make brute force impractical."),
  sec("offline-backup", 2, "Offline", "Why keep one backup disconnected?", "Ransomware can't encrypt what it can't reach", ["Offline drives are faster", "Cloud backups are illegal", "It saves electricity"], "Ransomware encrypts every drive it can see, including connected backups."),
];

export const BANK: BankCard[] = [...NETWORK_CARDS, ...SECURITY_CARDS];
