type File = {
  parentPath: string[];
  type: "file";
  name: string;
};

type Directory = {
  parentPath: string[];
  type: "directory";
  name: string;
  isOpen: boolean;
  children: Node[];
};

type Node = File | Directory;
