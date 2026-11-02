/* AuraLib catalog: sample records. Availability (copies, left, due) is simulated;
   live loans from the database are applied on top in app.js. */
window.CATALOG=(function(){
  var SUBJECTS=['All','Literature','Poetry','Philosophy & History','Science','Computer science','Design','Economics','Physics','Mathematics','Psychology','Central Asia'];
  var BOOKS=[
    {id:1,t:'Artificial Intelligence: A Modern Approach',a:'Stuart Russell, Peter Norvig',s:'Computer science',call:'Q335 .R86 2021',floor:2,aisle:14,shelf:'C',copies:3,left:2,y:2021,c:'#2F6F73'},
    {id:2,t:'Designing Data-Intensive Applications',a:'Martin Kleppmann',s:'Computer science',call:'QA76.9.D3 K54 2017',floor:2,aisle:16,shelf:'B',copies:2,left:0,due:6,y:2017,c:'#9A4A3A'},
    {id:3,t:'Introduction to Algorithms',a:'Thomas H. Cormen et al.',s:'Computer science',call:'QA76.6 .C662 2022',floor:2,aisle:13,shelf:'A',copies:4,left:3,y:2022,c:'#34568B'},
    {id:4,t:'The Design of Everyday Things',a:'Don Norman',s:'Design',call:'TS171 .N67 2013',floor:1,aisle:3,shelf:'D',copies:2,left:1,y:2013,c:'#B88A2A'},
    {id:5,t:'Don’t Make Me Think',a:'Steve Krug',s:'Design',call:'QA76.76.H94 K78 2014',floor:1,aisle:4,shelf:'B',copies:2,left:0,due:11,y:2014,c:'#5B4B8A'},
    {id:6,t:'Thinking, Fast and Slow',a:'Daniel Kahneman',s:'Economics',call:'BF441 .K238 2011',floor:3,aisle:27,shelf:'E',copies:3,left:3,y:2011,c:'#2F6F73'},
    {id:7,t:'The Wealth of Nations',a:'Adam Smith',s:'Economics',call:'HB161 .S6 2003',floor:3,aisle:30,shelf:'A',copies:1,left:1,y:2003,c:'#8A4A62'},
    {id:8,t:'The Feynman Lectures on Physics, Vol. 1',a:'Richard Feynman',s:'Physics',call:'QC23 .F435 2011',floor:3,aisle:34,shelf:'C',copies:2,left:1,y:2011,c:'#34568B'},
    {id:9,t:'A Brief History of Time',a:'Stephen Hawking',s:'Physics',call:'QB981 .H377 1998',floor:3,aisle:35,shelf:'B',copies:2,left:2,y:1998,c:'#B88A2A'},
    {id:10,t:'One Hundred Years of Solitude',a:'Gabriel García Márquez',s:'Literature',call:'PQ8180.17.A74 C513',floor:1,aisle:9,shelf:'F',copies:2,left:2,y:1970,c:'#9A4A3A'},
    {id:11,t:'The Master and Margarita',a:'Mikhail Bulgakov',s:'Literature',call:'PG3476.B78 M3713',floor:1,aisle:11,shelf:'A',copies:1,left:0,due:3,y:1997,c:'#2F6F73'}
  ];

  /* Russian authors (sample records, titles in English translation) */
  var RU=[
    ["War and Peace","Leo Tolstoy","Literature","PG3366 .W3 1869",1869],
    ["Anna Karenina","Leo Tolstoy","Literature","PG3365 .A6 1878",1878],
    ["Resurrection","Leo Tolstoy","Literature","PG3366 .V6 1899",1899],
    ["The Death of Ivan Ilyich","Leo Tolstoy","Literature","PG3366 .S4 1886",1886],
    ["Crime and Punishment","Fyodor Dostoevsky","Literature","PG3328 .P7 1866",1866],
    ["The Idiot","Fyodor Dostoevsky","Literature","PG3327 .I3 1869",1869],
    ["The Brothers Karamazov","Fyodor Dostoevsky","Literature","PG3326 .B7 1880",1880],
    ["Demons","Fyodor Dostoevsky","Literature","PG3327 .B4 1872",1872],
    ["Notes from Underground","Fyodor Dostoevsky","Literature","PG3328 .Z5 1864",1864],
    ["White Nights","Fyodor Dostoevsky","Literature","PG3328 .B4 1848",1848],
    ["The Cherry Orchard","Anton Chekhov","Literature","PG3456 .V5 1904",1904],
    ["Uncle Vanya","Anton Chekhov","Literature","PG3456 .D8 1899",1899],
    ["The Seagull","Anton Chekhov","Literature","PG3456 .C3 1896",1896],
    ["Selected Stories","Anton Chekhov","Literature","PG3456 .A3 1999",1999],
    ["Fathers and Sons","Ivan Turgenev","Literature","PG3420 .O8 1862",1862],
    ["A Sportsman\u2019s Sketches","Ivan Turgenev","Literature","PG3420 .Z3 1852",1852],
    ["Dead Souls","Nikolai Gogol","Literature","PG3333 .M4 1842",1842],
    ["The Overcoat","Nikolai Gogol","Literature","PG3333 .S5 1842",1842],
    ["The Government Inspector","Nikolai Gogol","Literature","PG3333 .R4 1836",1836],
    ["The Captain\u2019s Daughter","Alexander Pushkin","Literature","PG3347 .K3 1836",1836],
    ["A Hero of Our Time","Mikhail Lermontov","Literature","PG3337 .G4 1840",1840],
    ["Oblomov","Ivan Goncharov","Literature","PG3338 .O3 1859",1859],
    ["Heart of a Dog","Mikhail Bulgakov","Literature","PG3476 .B78 S4",1925],
    ["The White Guard","Mikhail Bulgakov","Literature","PG3476 .B78 B4",1925],
    ["Doctor Zhivago","Boris Pasternak","Literature","PG3476 .P27 D6",1957],
    ["One Day in the Life of Ivan Denisovich","Aleksandr Solzhenitsyn","Literature","PG3488 .O4 O5",1962],
    ["And Quiet Flows the Don","Mikhail Sholokhov","Literature","PG3476 .S5 T5",1940],
    ["Mother","Maxim Gorky","Literature","PG3465 .M6 1906",1906],
    ["The Lower Depths","Maxim Gorky","Literature","PG3465 .N3 1902",1902],
    ["We","Yevgeny Zamyatin","Literature","PG3476 .Z34 M9",1924],
    ["The Foundation Pit","Andrei Platonov","Literature","PG3476 .P55 K6",1930],
    ["Red Cavalry","Isaac Babel","Literature","PG3476 .B3 K6",1926],
    ["The Gentleman from San Francisco","Ivan Bunin","Literature","PG3465 .B8 G6",1915],
    ["Roadside Picnic","Arkady and Boris Strugatsky","Literature","PG3476 .S77 P5",1972],
    ["The Twelve Chairs","Ilya Ilf and Yevgeny Petrov","Literature","PG3476 .I55 D5",1928],
    ["Lady Macbeth of Mtsensk","Nikolai Leskov","Literature","PG3337 .L4 L4",1865],
    ["Eugene Onegin","Alexander Pushkin","Poetry","PG3347 .E8 1833",1833],
    ["Selected Poems","Alexander Pushkin","Poetry","PG3347 .A2 2012",2012],
    ["Selected Poems","Anna Akhmatova","Poetry","PG3476 .A4 A6",1976],
    ["Selected Poems","Marina Tsvetaeva","Poetry","PG3476 .T75 A6",1987],
    ["Stone","Osip Mandelstam","Poetry","PG3476 .M23 K3",1913],
    ["Collected Poems in English","Joseph Brodsky","Poetry","PG3479.6 .R64 A2",2000],
    ["Selected Poems","Sergei Yesenin","Poetry","PG3467 .E7 A6",1990],
    ["Selected Poems","Vladimir Mayakovsky","Poetry","PG3476 .M3 A6",1985],
    ["The Twelve","Alexander Blok","Poetry","PG3453 .B6 D8",1918],
    ["The Meaning of History","Nikolai Berdyaev","Philosophy & History","D16.8 .B4 1923",1923],
    ["The Meaning of Love","Vladimir Solovyov","Philosophy & History","B4260 .S6 1985",1892],
    ["A Course in Russian History","Vasily Klyuchevsky","Philosophy & History","DK38 .K59 1987",1904],
    ["Problems of Dostoevsky\u2019s Poetics","Mikhail Bakhtin","Philosophy & History","PG3328 .Z8 B3",1929],
    ["Morphology of the Folktale","Vladimir Propp","Philosophy & History","GR550 .P7 1968",1928],
    ["My Past and Thoughts","Alexander Herzen","Philosophy & History","DK209.6 .H4 A3",1868],
    ["Mutual Aid","Peter Kropotkin","Philosophy & History","HX833 .K7 1902",1902],
    ["Hope Against Hope","Nadezhda Mandelstam","Philosophy & History","PG3476 .M28 Z4",1970],
    ["Mind in Society","Lev Vygotsky","Philosophy & History","BF311 .V95 1978",1978],
    ["Principles of Chemistry","Dmitri Mendeleev","Science","QD31 .M5 1905",1868],
    ["Conditioned Reflexes","Ivan Pavlov","Science","QP376 .P3 1927",1927],
    ["The Biosphere","Vladimir Vernadsky","Science","QH343.4 .V4 1998",1926],
    ["Foundations of the Theory of Probability","Andrey Kolmogorov","Science","QA273 .K63 1956",1933],
    ["Mechanics (Course of Theoretical Physics, Vol. 1)","Lev Landau and Evgeny Lifshitz","Physics","QC125.2 .L3 1976",1976]
  ];
  var LOC={"Literature":[1,[8,9,10,11,12]],"Poetry":[1,[7]],"Philosophy & History":[3,[25,26]],"Science":[3,[31,32,33]],"Physics":[3,[34]]};
  var PAL=["#2F6F73","#9A4A3A","#34568B","#B88A2A","#5B4B8A","#8A4A62"];
  RU.forEach(function(r,i){
    var loc=LOC[r[2]], copies=1+(i%3), left=(i%5===0)?0:Math.max(1,copies-(i%4===1?1:0));
    var b={id:100+i,t:r[0],a:r[1],s:r[2],call:r[3],floor:loc[0],aisle:loc[1][i%loc[1].length],shelf:"ABCDEF".charAt(i%6),copies:copies,left:left,y:r[4],c:PAL[i%6]};
    if(!left)b.due=2+(i*3)%19;
    BOOKS.push(b);
  });

  /* ---- A4: 100 more titles (sample records; availability is simulated) ---- */
  var SUBJ2={C:['Computer science','QA76',2,[13,14,15,16,17]],M:['Mathematics','QA',2,[18,19]],S:['Science','Q',3,[31,32,33]],Y:['Physics','QC',3,[34,35,36]],E:['Economics','HB',3,[27,28,29,30]],G:['Psychology','BF',3,[26]],D:['Design','NK',1,[3,4]],H:['Philosophy & History','B',3,[25,26]],L:['Literature','PR',1,[9,10,11,12]],K:['Central Asia','PG',1,[5,6]],P:['Poetry','PS',1,[7]]};
  var NEWB=`
Clean Code|Robert C. Martin|C|2008
The Pragmatic Programmer|David Thomas, Andrew Hunt|C|2019
Structure and Interpretation of Computer Programs|Harold Abelson, Gerald Sussman|C|1996
Computer Networking: A Top-Down Approach|James Kurose, Keith Ross|C|2021
Operating System Concepts|Abraham Silberschatz et al.|C|2018
Database System Concepts|Abraham Silberschatz et al.|C|2019
Computer Organization and Design|David Patterson, John Hennessy|C|2020
Code Complete|Steve McConnell|C|2004
Design Patterns|Erich Gamma et al.|C|1994
Refactoring|Martin Fowler|C|2018
Deep Learning|Ian Goodfellow, Yoshua Bengio|C|2016
Pattern Recognition and Machine Learning|Christopher Bishop|C|2006
Hands-On Machine Learning|Aurélien Géron|C|2022
The Mythical Man-Month|Frederick Brooks|C|1995
Cryptography Engineering|Niels Ferguson, Bruce Schneier|C|2010
Computer Systems: A Programmer’s Perspective|Randal Bryant, David O’Hallaron|C|2015
Python Crash Course|Eric Matthes|C|2023
Internet of Things: Principles and Paradigms|Rajkumar Buyya, Amir Dastjerdi|C|2016
Building Microservices|Sam Newman|C|2021
Release It!|Michael Nygard|C|2018
Calculus|James Stewart|M|2015
Linear Algebra and Its Applications|David C. Lay|M|2015
Discrete Mathematics and Its Applications|Kenneth Rosen|M|2018
Concrete Mathematics|Ronald Graham, Donald Knuth|M|1994
How to Solve It|George Pólya|M|1945
Introduction to Probability|Joseph Blitzstein, Jessica Hwang|M|2019
Fermat’s Enigma|Simon Singh|M|1997
Gödel, Escher, Bach|Douglas Hofstadter|M|1979
The Selfish Gene|Richard Dawkins|S|1976
Cosmos|Carl Sagan|S|1980
Silent Spring|Rachel Carson|S|1962
The Structure of Scientific Revolutions|Thomas Kuhn|S|1962
On the Origin of Species|Charles Darwin|S|1859
Chemistry: The Central Science|Theodore Brown et al.|S|2017
Campbell Biology|Lisa Urry et al.|S|2020
The Gene|Siddhartha Mukherjee|S|2016
University Physics|Hugh Young, Roger Freedman|Y|2019
Introduction to Electrodynamics|David Griffiths|Y|2017
Introduction to Quantum Mechanics|David Griffiths|Y|2018
The Elegant Universe|Brian Greene|Y|1999
Six Easy Pieces|Richard Feynman|Y|1995
Astrophysics for People in a Hurry|Neil deGrasse Tyson|Y|2017
Principles of Economics|N. Gregory Mankiw|E|2020
Freakonomics|Steven Levitt, Stephen Dubner|E|2005
Capital in the Twenty-First Century|Thomas Piketty|E|2014
The General Theory of Employment, Interest and Money|John Maynard Keynes|E|1936
Poor Economics|Abhijit Banerjee, Esther Duflo|E|2011
The Intelligent Investor|Benjamin Graham|E|1949
Zero to One|Peter Thiel|E|2014
The Lean Startup|Eric Ries|E|2011
Good to Great|Jim Collins|E|2001
Nudge|Richard Thaler, Cass Sunstein|E|2008
Man’s Search for Meaning|Viktor Frankl|G|1946
Atomic Habits|James Clear|G|2018
Flow|Mihaly Csikszentmihalyi|G|1990
Influence: The Psychology of Persuasion|Robert Cialdini|G|1984
Grit|Angela Duckworth|G|2016
Mindset|Carol Dweck|G|2006
Deep Work|Cal Newport|G|2016
Predictably Irrational|Dan Ariely|G|2008
Universal Principles of Design|William Lidwell et al.|D|2010
Sprint|Jake Knapp|D|2016
The Elements of Typographic Style|Robert Bringhurst|D|2004
Ways of Seeing|John Berger|D|1972
Hooked|Nir Eyal|D|2014
Refactoring UI|Adam Wathan, Steve Schoger|D|2018
Sapiens|Yuval Noah Harari|H|2011
Guns, Germs, and Steel|Jared Diamond|H|1997
The Republic|Plato|H|2004
Meditations|Marcus Aurelius|H|2002
Critique of Pure Reason|Immanuel Kant|H|1998
Beyond Good and Evil|Friedrich Nietzsche|H|1886
The Prince|Niccolò Machiavelli|H|1532
Leviathan|Thomas Hobbes|H|1651
The Silk Roads|Peter Frankopan|H|2015
Nicomachean Ethics|Aristotle|H|2009
1984|George Orwell|L|1949
Animal Farm|George Orwell|L|1945
Pride and Prejudice|Jane Austen|L|1813
Jane Eyre|Charlotte Brontë|L|1847
The Great Gatsby|F. Scott Fitzgerald|L|1925
To Kill a Mockingbird|Harper Lee|L|1960
Brave New World|Aldous Huxley|L|1932
The Trial|Franz Kafka|L|1925
The Metamorphosis|Franz Kafka|L|1915
The Stranger|Albert Camus|L|1942
Don Quixote|Miguel de Cervantes|L|1605
Les Misérables|Victor Hugo|L|1862
The Little Prince|Antoine de Saint-Exupéry|L|1943
The Alchemist|Paulo Coelho|L|1988
The Path of Abai|Mukhtar Auezov|K|1942
Book of Words|Abai Kunanbayev|K|1904
The Day Lasts More Than a Hundred Years|Chingiz Aitmatov|K|1980
Jamila|Chingiz Aitmatov|K|1958
Genghis Khan and the Making of the Modern World|Jack Weatherford|K|2004
The Great Game|Peter Hopkirk|K|1990
Leaves of Grass|Walt Whitman|P|1855
The Waste Land|T. S. Eliot|P|1922
Ariel|Sylvia Plath|P|1965
Duino Elegies|Rainer Maria Rilke|P|1923
`;
  NEWB.split('\n').forEach(function(ln,i){
    var p=ln.trim().split('|');if(p.length<4)return;i--;
    var m=SUBJ2[p[2]],copies=2+(i%3),r=(i*37+11)%10,pop=/[CGE]/.test(p[2])?3:1,out=r<pop?copies:(r<pop+2?1:0),left=copies-out;
    var sur=p[1].split(/,| and /)[0].trim().split(' ').pop().charAt(0).toUpperCase();
    var b={id:200+i,t:p[0],a:p[1],s:m[0],call:m[1]+' '+(100+(i*53)%800)+' .'+sur+(1+i%9)+' '+p[3],floor:m[2],aisle:m[3][i%m[3].length],shelf:'ABCDEF'.charAt(i%6),copies:copies,left:left,y:+p[3],c:PAL[(i+2)%6]};
    if(!left)b.due=2+(i*5)%19;BOOKS.push(b);
  });

  /* ---- A4 batch 2: 150 more titles (sample records; availability is simulated) ---- */
  var NEWB2=`
Algorithms|Robert Sedgewick, Kevin Wayne|C|2011
The Art of Computer Programming, Vol. 1|Donald Knuth|C|1997
Compilers: Principles, Techniques, and Tools|Alfred Aho et al.|C|2006
Modern Operating Systems|Andrew Tanenbaum|C|2014
Computer Networks|Andrew Tanenbaum|C|2010
Speech and Language Processing|Daniel Jurafsky, James Martin|C|2023
Reinforcement Learning: An Introduction|Richard Sutton, Andrew Barto|C|2018
The Elements of Statistical Learning|Trevor Hastie et al.|C|2009
Machine Learning: A Probabilistic Perspective|Kevin Murphy|C|2012
Computer Vision: Algorithms and Applications|Richard Szeliski|C|2022
Clean Architecture|Robert C. Martin|C|2017
Domain-Driven Design|Eric Evans|C|2003
Working Effectively with Legacy Code|Michael Feathers|C|2004
Head First Design Patterns|Eric Freeman, Elisabeth Robson|C|2020
Effective Java|Joshua Bloch|C|2018
Fluent Python|Luciano Ramalho|C|2022
JavaScript: The Good Parts|Douglas Crockford|C|2008
Eloquent JavaScript|Marijn Haverbeke|C|2018
The C Programming Language|Brian Kernighan, Dennis Ritchie|C|1988
Programming Pearls|Jon Bentley|C|1999
The Phoenix Project|Gene Kim et al.|C|2018
Site Reliability Engineering|Betsy Beyer et al.|C|2016
Accelerate|Nicole Forsgren et al.|C|2018
Security Engineering|Ross Anderson|C|2020
Applied Cryptography|Bruce Schneier|C|2015
The Web Application Hacker’s Handbook|Dafydd Stuttard, Marcus Pinto|C|2011
Computer Security: Principles and Practice|William Stallings|C|2018
Database Internals|Alex Petrov|C|2019
Learning SQL|Alan Beaulieu|C|2020
Python for Data Analysis|Wes McKinney|C|2022
Principles of Mathematical Analysis|Walter Rudin|M|1976
Abstract Algebra|David Dummit, Richard Foote|M|2003
Introduction to Graph Theory|Douglas West|M|2000
Probability and Statistics|Morris DeGroot|M|2011
Elementary Number Theory|David Burton|M|2010
Numerical Analysis|Richard Burden|M|2015
Naive Set Theory|Paul Halmos|M|1960
The Joy of x|Steven Strogatz|M|2012
Introduction to the Theory of Computation|Michael Sipser|M|2012
Linear Algebra Done Right|Sheldon Axler|M|2015
The Double Helix|James Watson|S|1968
A Short History of Nearly Everything|Bill Bryson|S|2003
The Immortal Life of Henrietta Lacks|Rebecca Skloot|S|2010
Organic Chemistry|Paula Bruice|S|2016
Molecular Biology of the Cell|Bruce Alberts et al.|S|2014
Biochemistry|Jeremy Berg et al.|S|2019
The Sixth Extinction|Elizabeth Kolbert|S|2014
Why We Sleep|Matthew Walker|S|2017
The Emperor of All Maladies|Siddhartha Mukherjee|S|2010
Genome|Matt Ridley|S|1999
Chaos|James Gleick|S|1987
The Body|Bill Bryson|S|2019
Physics for Scientists and Engineers|Raymond Serway|Y|2018
Fundamentals of Physics|David Halliday et al.|Y|2013
Classical Mechanics|John Taylor|Y|2005
Thermal Physics|Daniel Schroeder|Y|1999
Modern Physics|Kenneth Krane|Y|2012
Relativity: The Special and General Theory|Albert Einstein|Y|1916
The Order of Time|Carlo Rovelli|Y|2018
The Universe in a Nutshell|Stephen Hawking|Y|2001
QED: The Strange Theory of Light and Matter|Richard Feynman|Y|1985
Microeconomics|Robert Pindyck, Daniel Rubinfeld|E|2018
Macroeconomics|Olivier Blanchard|E|2021
Economics|Paul Samuelson, William Nordhaus|E|2009
Why Nations Fail|Daron Acemoglu, James Robinson|E|2012
The Undercover Economist|Tim Harford|E|2005
Basic Economics|Thomas Sowell|E|2014
Principles of Corporate Finance|Richard Brealey et al.|E|2020
A Random Walk Down Wall Street|Burton Malkiel|E|2019
Marketing Management|Philip Kotler|E|2015
Competitive Strategy|Michael Porter|E|1980
The Innovator’s Dilemma|Clayton Christensen|E|1997
The Black Swan|Nassim Taleb|E|2007
The Road to Serfdom|Friedrich Hayek|E|1944
Capitalism and Freedom|Milton Friedman|E|1962
Thinking in Bets|Annie Duke|G|2018
The Power of Habit|Charles Duhigg|G|2012
Emotional Intelligence|Daniel Goleman|G|1995
Drive|Daniel Pink|G|2009
Quiet|Susan Cain|G|2012
Psychology|David Myers|G|2020
Stumbling on Happiness|Daniel Gilbert|G|2006
Outliers|Malcolm Gladwell|G|2008
The Body Keeps the Score|Bessel van der Kolk|G|2014
A Mind for Numbers|Barbara Oakley|G|2014
Make It Stick|Peter Brown et al.|G|2014
Peak|Anders Ericsson|G|2016
The Non-Designer’s Design Book|Robin Williams|D|2014
Thinking with Type|Ellen Lupton|D|2010
Grid Systems in Graphic Design|Josef Müller-Brockmann|D|1981
Emotional Design|Don Norman|D|2004
About Face|Alan Cooper et al.|D|2014
Lean UX|Jeff Gothelf|D|2021
The Visual Display of Quantitative Information|Edward Tufte|D|2001
Laws of UX|Jon Yablonski|D|2020
Steal Like an Artist|Austin Kleon|D|2012
A History of Western Philosophy|Bertrand Russell|H|1945
The Story of Philosophy|Will Durant|H|1926
Thus Spoke Zarathustra|Friedrich Nietzsche|H|1883
Being and Time|Martin Heidegger|H|1927
The Social Contract|Jean-Jacques Rousseau|H|1762
Utopia|Thomas More|H|1516
Politics|Aristotle|H|2013
The Art of War|Sun Tzu|H|2005
The Histories|Herodotus|H|2003
Orientalism|Edward Said|H|1978
The Clash of Civilizations|Samuel Huntington|H|1996
Homo Deus|Yuval Noah Harari|H|2016
Prisoners of Geography|Tim Marshall|H|2015
Justice|Michael Sandel|H|2009
Hamlet|William Shakespeare|L|1603
Macbeth|William Shakespeare|L|1606
Romeo and Juliet|William Shakespeare|L|1597
Frankenstein|Mary Shelley|L|1818
Dracula|Bram Stoker|L|1897
Wuthering Heights|Emily Brontë|L|1847
Great Expectations|Charles Dickens|L|1861
The Picture of Dorian Gray|Oscar Wilde|L|1890
Moby-Dick|Herman Melville|L|1851
The Catcher in the Rye|J. D. Salinger|L|1951
Of Mice and Men|John Steinbeck|L|1937
The Old Man and the Sea|Ernest Hemingway|L|1952
Lord of the Flies|William Golding|L|1954
Fahrenheit 451|Ray Bradbury|L|1953
Dune|Frank Herbert|L|1965
The Hobbit|J. R. R. Tolkien|L|1937
Things Fall Apart|Chinua Achebe|L|1958
Norwegian Wood|Haruki Murakami|L|1987
Love in the Time of Cholera|Gabriel García Márquez|L|1985
The Name of the Rose|Umberto Eco|L|1980
The Silk Road: A New History|Valerie Hansen|K|2012
The Empire of the Steppes|René Grousset|K|1970
Lost Enlightenment|S. Frederick Starr|K|2013
Tamerlane|Justin Marozzi|K|2004
Az and Ya|Olzhas Suleimenov|K|1975
The White Steamship|Chingiz Aitmatov|K|1970
Farewell, Gulsary!|Chingiz Aitmatov|K|1966
The Scaffold|Chingiz Aitmatov|K|1986
The Nomads|Ilyas Yesenberlin|K|1976
Kazakhstan: Ethnicity, Language and Power|Bhavna Dave|K|2007
North of Boston|Robert Frost|P|1914
Howl and Other Poems|Allen Ginsberg|P|1956
Songs of Innocence and of Experience|William Blake|P|1794
The Complete Poems|Emily Dickinson|P|1960
Paradise Lost|John Milton|P|1667
Selected Poems|W. B. Yeats|P|1933
Les Fleurs du mal|Charles Baudelaire|P|1857
Sonnets|William Shakespeare|P|1609
Odes|John Keats|P|1819
The Odyssey|Homer|P|1996
`;
  var n2=0;
  NEWB2.split('\n').forEach(function(ln){
    var p=ln.trim().split('|');if(p.length<4)return;var i=n2++;
    var m=SUBJ2[p[2]],copies=2+(i%3),r=(i*29+7)%10,pop=/[CGE]/.test(p[2])?3:1,out=r<pop?copies:(r<pop+2?1:0),left=copies-out;
    var sur=p[1].split(/,| and /)[0].trim().split(' ').pop().charAt(0).toUpperCase();
    var b={id:400+i,t:p[0],a:p[1],s:m[0],call:m[1]+' '+(100+(i*61)%800)+' .'+sur+(1+i%9)+' '+p[3],floor:m[2],aisle:m[3][i%m[3].length],shelf:'ABCDEF'.charAt((i+3)%6),copies:copies,left:left,y:+p[3],c:PAL[(i+4)%6]};
    if(!left)b.due=2+(i*7)%19;BOOKS.push(b);
  });

  /* ---- A4 batch 3: 180 more titles (sample records; availability is simulated) ---- */
  var NEWB3=`
Introduction to Machine Learning|Ethem Alpaydin|C|2020
Probabilistic Graphical Models|Daphne Koller, Nir Friedman|C|2009
Artificial Intelligence: Foundations of Computational Agents|David Poole, Alan Mackworth|C|2017
Neural Networks and Deep Learning|Michael Nielsen|C|2015
Natural Language Processing with Python|Steven Bird et al.|C|2009
Algorithm Design|Jon Kleinberg, Éva Tardos|C|2005
The Algorithm Design Manual|Steven Skiena|C|2020
Grokking Algorithms|Aditya Bhargava|C|2016
Cracking the Coding Interview|Gayle Laakmann McDowell|C|2015
Crafting Interpreters|Robert Nystrom|C|2021
Operating Systems: Three Easy Pieces|Remzi Arpaci-Dusseau|C|2018
The Linux Programming Interface|Michael Kerrisk|C|2010
Unix Network Programming|W. Richard Stevens|C|2003
TCP/IP Illustrated, Volume 1|W. Richard Stevens|C|2011
Computer Architecture: A Quantitative Approach|John Hennessy, David Patterson|C|2017
Digital Design and Computer Architecture|David Harris, Sarah Harris|C|2012
Code: The Hidden Language of Computer Hardware and Software|Charles Petzold|C|2022
Patterns of Enterprise Application Architecture|Martin Fowler|C|2002
Enterprise Integration Patterns|Gregor Hohpe, Bobby Woolf|C|2003
Continuous Delivery|Jez Humble, David Farley|C|2010
The DevOps Handbook|Gene Kim et al.|C|2016
Kubernetes in Action|Marko Lukša|C|2018
Docker Deep Dive|Nigel Poulton|C|2020
Learning React|Alex Banks, Eve Porcello|C|2020
Node.js Design Patterns|Mario Casciaro|C|2020
The Rust Programming Language|Steve Klabnik, Carol Nichols|C|2019
The Go Programming Language|Alan Donovan, Brian Kernighan|C|2015
Test-Driven Development: By Example|Kent Beck|C|2002
Extreme Programming Explained|Kent Beck|C|2004
Peopleware|Tom DeMarco, Timothy Lister|C|2013
Calculus: Early Transcendentals|Howard Anton|M|2012
Differential Equations|Dennis Zill|M|2016
Complex Analysis|Elias Stein, Rami Shakarchi|M|2003
Topology|James Munkres|M|2000
Introduction to Linear Algebra|Gilbert Strang|M|2016
Mathematical Methods in the Physical Sciences|Mary Boas|M|2005
Probability Theory: The Logic of Science|E. T. Jaynes|M|2003
Statistics|David Freedman et al.|M|2007
The Art of Statistics|David Spiegelhalter|M|2019
Naked Statistics|Charles Wheelan|M|2013
Prime Obsession|John Derbyshire|M|2003
The Man Who Knew Infinity|Robert Kanigel|M|1991
Euclid’s Elements|Euclid|M|2002
Flatland|Edwin Abbott|M|1884
Lab Girl|Hope Jahren|S|2016
The Hot Zone|Richard Preston|S|1994
Surely You’re Joking, Mr. Feynman!|Richard Feynman|S|1985
Microbiology: An Introduction|Gerard Tortora|S|2018
Principles of Anatomy and Physiology|Gerard Tortora|S|2017
Genetics: From Genes to Genomes|Leland Hartwell|S|2018
Physical Chemistry|Peter Atkins|S|2018
Inorganic Chemistry|Gary Miessler|S|2013
Earth: Portrait of a Planet|Stephen Marshak|S|2019
An Immense World|Ed Yong|S|2022
I Contain Multitudes|Ed Yong|S|2016
The Song of the Cell|Siddhartha Mukherjee|S|2022
Braiding Sweetgrass|Robin Wall Kimmerer|S|2013
The Ghost Map|Steven Johnson|S|2006
Longitude|Dava Sobel|S|1995
The Disappearing Spoon|Sam Kean|S|2010
The Periodic Table|Primo Levi|S|1975
Gulp|Mary Roach|S|2013
Spillover|David Quammen|S|2012
The Beak of the Finch|Jonathan Weiner|S|1994
Pale Blue Dot|Carl Sagan|Y|1994
The Quantum Universe|Brian Cox, Jeff Forshaw|Y|2011
Quantum Mechanics: The Theoretical Minimum|Leonard Susskind|Y|2014
Classical Mechanics: The Theoretical Minimum|Leonard Susskind|Y|2013
Gravitation|Charles Misner et al.|Y|1973
Spacetime Physics|Edwin Taylor|Y|1992
The Large Scale Structure of Space-Time|Stephen Hawking|Y|1973
Physics of the Impossible|Michio Kaku|Y|2008
The Fabric of the Cosmos|Brian Greene|Y|2004
The Hidden Reality|Brian Greene|Y|2011
Optics|Eugene Hecht|Y|2016
Solid State Physics|Neil Ashcroft|Y|1976
Economics in One Lesson|Henry Hazlitt|E|1946
The Theory of Moral Sentiments|Adam Smith|E|1759
Misbehaving|Richard Thaler|E|2015
The Big Short|Michael Lewis|E|2010
Liar’s Poker|Michael Lewis|E|1989
Debt: The First 5,000 Years|David Graeber|E|2011
Doughnut Economics|Kate Raworth|E|2017
Development as Freedom|Amartya Sen|E|1999
The End of Poverty|Jeffrey Sachs|E|2005
The Bottom Billion|Paul Collier|E|2007
Globalization and Its Discontents|Joseph Stiglitz|E|2002
Thinking Strategically|Avinash Dixit, Barry Nalebuff|E|1991
Economic Facts and Fallacies|Thomas Sowell|E|2008
Principles of Microeconomics|Karl Case|E|2016
Investments|Zvi Bodie|E|2017
Security Analysis|Benjamin Graham, David Dodd|E|1934
The Little Book of Common Sense Investing|John Bogle|E|2007
Blue Ocean Strategy|W. Chan Kim|E|2005
Crossing the Chasm|Geoffrey Moore|E|1991
The Hard Thing About Hard Things|Ben Horowitz|E|2014
The Interpretation of Dreams|Sigmund Freud|G|1899
Man and His Symbols|Carl Jung|G|1964
Behave|Robert Sapolsky|G|2017
Why Zebras Don’t Get Ulcers|Robert Sapolsky|G|2004
The Happiness Hypothesis|Jonathan Haidt|G|2006
The Righteous Mind|Jonathan Haidt|G|2012
Authentic Happiness|Martin Seligman|G|2002
Learned Optimism|Martin Seligman|G|1990
The Gifts of Imperfection|Brené Brown|G|2010
Daring Greatly|Brené Brown|G|2012
How to Win Friends and Influence People|Dale Carnegie|G|1936
The 7 Habits of Highly Effective People|Stephen Covey|G|1989
Lost Connections|Johann Hari|G|2018
Social Psychology|David Myers|G|2018
The Elements of User Experience|Jesse James Garrett|D|2010
Sketching User Experiences|Bill Buxton|D|2007
100 Things Every Designer Needs to Know About People|Susan Weinschenk|D|2011
Change by Design|Tim Brown|D|2009
Logo Design Love|David Airey|D|2014
Designing Interfaces|Jenifer Tidwell|D|2010
Information Architecture|Louis Rosenfeld|D|2015
Atomic Design|Brad Frost|D|2016
Design Systems|Alla Kholmatova|D|2017
The Shape of Design|Frank Chimero|D|2012
Discourse on Method|René Descartes|H|1637
Critique of Practical Reason|Immanuel Kant|H|1788
An Enquiry Concerning Human Understanding|David Hume|H|1748
Two Treatises of Government|John Locke|H|1689
The Spirit of the Laws|Montesquieu|H|1748
Democracy in America|Alexis de Tocqueville|H|1835
On Liberty|John Stuart Mill|H|1859
The Communist Manifesto|Karl Marx, Friedrich Engels|H|1848
The Second Sex|Simone de Beauvoir|H|1949
The Origins of Totalitarianism|Hannah Arendt|H|1951
Discipline and Punish|Michel Foucault|H|1975
A Theory of Justice|John Rawls|H|1971
The Peloponnesian War|Thucydides|H|1954
The Rise and Fall of the Third Reich|William Shirer|H|1960
The Age of Revolution|Eric Hobsbawm|H|1962
SPQR|Mary Beard|H|2015
Postwar|Tony Judt|H|2005
The Black Death|Philip Ziegler|H|1969
Emma|Jane Austen|L|1815
Sense and Sensibility|Jane Austen|L|1811
Middlemarch|George Eliot|L|1871
Vanity Fair|William Makepeace Thackeray|L|1848
David Copperfield|Charles Dickens|L|1850
A Tale of Two Cities|Charles Dickens|L|1859
Tess of the d’Urbervilles|Thomas Hardy|L|1891
Heart of Darkness|Joseph Conrad|L|1899
Mrs Dalloway|Virginia Woolf|L|1925
To the Lighthouse|Virginia Woolf|L|1927
A Farewell to Arms|Ernest Hemingway|L|1929
The Sun Also Rises|Ernest Hemingway|L|1926
The Grapes of Wrath|John Steinbeck|L|1939
East of Eden|John Steinbeck|L|1952
Catch-22|Joseph Heller|L|1961
Slaughterhouse-Five|Kurt Vonnegut|L|1969
One Flew Over the Cuckoo’s Nest|Ken Kesey|L|1962
The Bell Jar|Sylvia Plath|L|1963
Invisible Man|Ralph Ellison|L|1952
The Color Purple|Alice Walker|L|1982
The Handmaid’s Tale|Margaret Atwood|L|1985
Neuromancer|William Gibson|L|1984
The Left Hand of Darkness|Ursula K. Le Guin|L|1969
Foundation|Isaac Asimov|L|1951
I, Robot|Isaac Asimov|L|1950
The Hitchhiker’s Guide to the Galaxy|Douglas Adams|L|1979
Genghis Khan: His Conquests, His Empire, His Legacy|Frank McLynn|K|2015
The Secret History of the Mongols|Anonymous|K|2004
Bukhara: The Medieval Achievement|Richard Frye|K|1965
The Heritage of Central Asia|Richard Frye|K|1996
Setting the East Ablaze|Peter Hopkirk|K|1984
Foreign Devils on the Silk Road|Peter Hopkirk|K|1980
The Kazakhs|Martha Olcott|K|1987
A Ride to Khiva|Fred Burnaby|K|1876
Twenty Love Poems and a Song of Despair|Pablo Neruda|P|1924
Gitanjali|Rabindranath Tagore|P|1910
The Prophet|Kahlil Gibran|P|1923
The Rubaiyat|Omar Khayyam|P|1859
The Masnavi|Rumi|P|2004
Beowulf|Anonymous|P|2000
The Iliad|Homer|P|1990
Poems|Wisława Szymborska|P|1996
`;
  var n3=0;
  NEWB3.split('\n').forEach(function(ln){
    var p=ln.trim().split('|');if(p.length<4)return;var i=n3++;
    var m=SUBJ2[p[2]],copies=2+(i%3),r=(i*31+5)%10,pop=/[CGE]/.test(p[2])?3:1,out=r<pop?copies:(r<pop+2?1:0),left=copies-out;
    var sur=p[1].split(/,| and /)[0].trim().split(' ').pop().charAt(0).toUpperCase();
    var b={id:600+i,t:p[0],a:p[1],s:m[0],call:m[1]+' '+(100+(i*67)%800)+' .'+sur+(1+i%9)+' '+p[3],floor:m[2],aisle:m[3][(i+1)%m[3].length],shelf:'ABCDEF'.charAt((i+1)%6),copies:copies,left:left,y:+p[3],c:PAL[(i+1)%6]};
    if(!left)b.due=2+(i*11)%19;BOOKS.push(b);
  });
  return{SUBJECTS:SUBJECTS,BOOKS:BOOKS};
})();
